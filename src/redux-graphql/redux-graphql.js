import indexSchema from './indexSchema'
import {not,transToObject,isString,hasKey,isObjectLike,isInteger,or,cond,identity,isArray,and,stubTrue,diffBy, tdMap, tdFilter, tdDPipeToArray, toPredicate,scan, diffObjs, tdToObject, tdToObjectImmutable, tdReduce, transduceDF, tdMapKey, memoize, over, pick,ensureArray, tdLog,compose, mapToObject, pipe, tdTap, overObj,transArrayToObject,transObjectToObject, ifElse, transObjectToArray} from '@a-laughlin/fp-utils';
export {default as gql} from 'graphql-tag';

const keyDiff=(v,k)=>k;
const defaultActions = {
  ADD:nextReducer=>(prevState,action)=>{
    // if collection/item/value
    // which has a simpler dependency graph topology?  These fns, handling different types, or or a mutation tree?
    // note: If mutation tree, these could be property functions, like "filter" and "omit" on query
    return nextReducer(({...prevState,...action.payload}),action)
  },
  SUBTRACT:nextReducer=>(prevState,action)=>{
    const diff = diffBy(keyDiff,[prevState,action.payload]);
    let nextState={},k;
    if (diff.aibc===0) return nextReducer(prevState,action); // no intersection to remove
    if (diff.aibc===diff.aubc) return nextReducer(nextState,action); // complete intersection. remove everything
    for (k in diff.anb)nextState[k]=prevState[k]; // copy non-intersecting collection items to new state
    return nextReducer(nextState,action);
  },
  UNION:nextReducer=>(prevState,action)=>{
    const diff = diffBy(keyDiff,[prevState,action.payload]);
    let nextState={},k;
    for (k in diff.aub)nextState[k]=action.payload[k]??prevState[k];
    return nextReducer(diff.changedc===0?prevState:nextState,action);
  },
  INTERSECTION:nextReducer=>(prevState,action)=>{
    const diff = diffBy(keyDiff,[prevState,action.payload]);
    let nextState={},k;
    for (k in diff.aib)nextState[k]=action.payload[k];
    return nextReducer(diff.changedc===0?prevState:nextState,action);
  },
  SET:nextReducer=>(prevState,action)=>nextReducer(action.payload,action),
  GET:nextReducer=>(prevState,action)=>nextReducer(prevState,action)
};

export const schemaToActionCreators=(schema=gql('type Example {id:ID}'))=>(ops=defaultActions)=>{
  // const transduce = (initial,finalReducer,transducer,val)
  const {selectionMeta}=indexSchema(schema);
  const actionNormalizers = mapToObject(({defKind,_idKey})=>cond(
    // leave scalars and other non-object types
    [_=>defKind!=='object',identity],
    // convert number/string id to collection
    [isString,payload=>({[payload]:{[_idKey]:payload}})],
    // convert number/string id to collection
    [isInteger,payload=>({[payload]:{[_idKey]:`${payload}`}})],
    // convert array to collection
    [isArray,transToObject((o,v)=>{
      v=normalizePayload(v);
      o[v[_idKey]]=v;
    })],
    // convert single item to collection
    [and(isObjectLike,hasKey(_idKey)), payload=>({[payload[_idKey]]:payload})],
    // collection, leave as is
    [stubTrue,identity]
  ))(selectionMeta);
  
  return transToObject((acc,actionNormalizer,dName)=>{
    const opFns=transToObject((o,opFn,OP)=>o[`${dName.toUpperCase()}_${OP}`]=opFn(identity))(ops)
    acc[dName]=(prevState=null,action={})=>{
      return action.type in opFns
        ? opFns[action.type](prevState,{...action,payload:actionNormalizer(action.payload)})
        : prevState;
    }
  })(actionNormalizers);
};

const getArgsPopulator = vars=>{
  const inner = transArrayToObject((result,{name:{value:name},value})=>{
    if(value.kind==='Variable') result[name] = vars[value.name.value];
    else if (value.kind==='ObjectValue') result[name] = inner(value.fields);
    else result[name] = value.value;
  });
  return inner;
};
const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>{
  let vars = {},name,defaultValue;
  // default per spec is returning only what's in variableDefinitions, but this eliminates the duplicate definitions in each query to pass a variable, given it's usually specified in the schema already.  Can always change it to the more verbose version and add validation if necessary.
  if (variableDefinitions.length===0) return passedVariables;
  for ({variable:{name:{value:name}},defaultValue} of variableDefinitions)
  vars[name]=passedVariables[name]??((defaultValue??{}).value);
  return vars;
};

// filtering language ...
// a dsl is complicated https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// for mvp mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter
export const getObjectQuerier=( schema, queryMatchers={ filter:toPredicate, omit:x=>not(toPredicate(x))} )=>{
  
  const isScalarField=([meta,Field])=>(meta[Field.name.value]??meta).defKind==='scalar';
  const isObjectField=([meta,Field])=>(meta[Field.name.value]??meta).defKind==='object';
  const isListField=([meta,Field])=>meta.isList;
  const isPrimitiveValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>!isObjectLike(vNorm);
  const isObjectValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>isObjectLike(vNorm);
  const isItemValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>isObjectLike(vNorm)&&meta._idKey in vNorm;
  const isCollectionValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>isObjectLike(vNorm) && !(meta._idKey in vNorm);
  
  
  const mapItem=([meta,Field,vDenormPrev={},vNorm,vNormPrev={},prevDenormRoot,rootState,prevRoot,getArgs])=>{
    let vDenorm={},changed=vNorm!==vNormPrev;
    for (const f of Field.selectionSet.selections||[]){
      const k=f.name.value;
      const fieldMeta=meta[k];
      vDenorm[k]=fieldMeta.defKind==='scalar'
        ? rootState[meta.defName][vNorm[meta._idKey]][k]
        : fieldMeta.isList
          ? mapCollection([ fieldMeta.rel, f, vDenormPrev[k], pick(vNorm[k])(rootState[fieldMeta.rel.defName]), pick(vNormPrev[k])(prevRoot[fieldMeta.rel.defName]), prevDenormRoot,rootState,prevRoot, getArgs])
          : mapItem([ fieldMeta.rel, f, vDenormPrev[k]||{}, rootState[fieldMeta.rel.defName][vNorm[k]]||{}, prevRoot[fieldMeta.rel.defName][vNorm[k]]||{}, prevDenormRoot,rootState,prevRoot,getArgs ]);
      if(vDenorm[k]!==vDenormPrev[k]) changed = true;
    }
    return changed ? vDenorm : vDenormPrev;
  };

  const mapCollection=([meta,Field,vDenormPrev={},vNorm,vNormPrev={},prevDenormRoot,rootState,prevRoot,getArgs])=>{
    // on the first traverse up, break if the final collection is unchanged since its items will be too.
    if(meta.objectFields.length===0&&vNorm===vNormPrev) return vDenormPrev;
    const args = getArgs(Field.arguments);
    const argIds = ensureArray(args[meta._idKey]);
    if(argIds.length) vNorm=transArrayToObject((o,i)=>o[i]=vNorm[i])(argIds);
    const queryMatcherFns=transObjectToArray((a,arg,k)=>k in queryMatchers && (a[a.length]=queryMatchers[k](arg)))(args);
    const matchesFn = queryMatcherFns.length===0 ? queryMatchers.filter(args) : and(...queryMatcherFns);
    let vDenorm={},changed=vNorm!==vNormPrev;
    for(const id in vNorm){
      matchesFn(vNorm[id])&&(vDenorm[id]=mapItem([meta,Field,vDenormPrev[id],vNorm[id],vNormPrev[id],prevDenormRoot,rootState,prevRoot,getArgs]));
      if(vDenorm[id]!==vDenormPrev[id])changed=true;
    }
    return changed?vDenorm:vDenormPrev;
  }

  const mapSelection=cond([
    [isScalarField,cond([
      [isObjectValue,()=>new Error('cannot request object without selecting fields')],
      [isPrimitiveValue,([meta,Field,vDenormPrev,vNorm])=>vNorm]
    ])],
    [isObjectField,cond([
      [isPrimitiveValue,([{defName},Field,vDenormPrev,vNorm])=>new Error(`cannot request fields of a primitive ${JSON.stringify({value:vNorm,defName},null,2)}`)],
      [isCollectionValue,mapCollection],
      [isItemValue,mapItem],// item (worth noting that root state is also an item with no key, given its heterogenous values);
    ])],
  ]);
  const {selectionMeta}=indexSchema(schema);
  const mapQuery= (query,passedVariables={})=>{
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
    const selections=query.definitions[0].selectionSet.selections;
    return (rootState={},prevRoot=rootState,prevDenormRoot={})=>{
      let denormRoot={},changed=rootState!==prevRoot;
      for (const s of selections){
        const k=s.name.value;
        denormRoot[k]=mapSelection([selectionMeta[k],s,prevDenormRoot[k],rootState[k],prevRoot[k],prevDenormRoot,rootState,prevRoot,argsPopulator])
        if(denormRoot[k]!==prevDenormRoot[k])changed=true;
      }
      return changed?denormRoot:prevDenormRoot;
    };
  };
  return mapQuery;
};


export const getUseQuery=(querier,store,useState,useEffect,useMemo)=>{
  return (query,variables)=>{
    const queryFn=useMemo(()=>querier(query,variables),[variables]);
    const [state,setState] = useState([store.getState(),queryFn(store.getState())]);
    useEffect(()=>store.subscribe(()=> { // returns the unsubscribe function
      setState(([prevNormed,prevDenormed])=>{
        const normed = store.getState();
        return [normed,queryFn(normed,prevNormed,prevDenormed)];
      });
    }),[]);
    return state[1];
  };
};





// export const diffBy = (by, reducer) => (args = []) => {
//   const diff = by ? diffObjs(args.map(keyBy(by))) : diffObjs(args);
//   const { anb, anbc, bna, bnac, aib, aibc, aub, aubc, changed, changedc, a, b } = diff;
//   const reused = { anb, anbc, bna, bnac, aib, aibc, aub, aubc, changed, changedc, a, b };
//   // eliminate one of the three loops by combining this directly with diffObjs
//   // put the first loop before the iterator, and the second in iterator, yielding while it goes
//   // cons:
//   // unsure how much of a performance hit iterable protocol is. Would need to test that.
//   // counts inaccurate until after.  Keeping separate for now.
//   // reused.diff = diff;
//   if (reducer) {
//     let k, acc;
//     for (k in aub) {
//       reused.anb = anb[k];
//       reused.bna = bna[k];
//       reused.aib = aib[k];
//       reused.aub = aub[k];
//       reused.changed = changed[k];
//       reused.a = a[k];
//       reused.b = b[k];
//       reused.k = k;
//       acc = reducer(acc, reused, k);
//     }
//     return acc;
//   } else {
//     // uncertain if this has performance benefits.  Need to test.
//     reused[Symbol.iterator] = reused.next = function* () {
//       let k;
//       for (k in aub) {
//         reused.anb = anb[k];
//         reused.bna = bna[k];
//         reused.aib = aib[k];
//         reused.aub = aub[k];
//         reused.changed = changed[k];
//         reused.a = a[k];
//         reused.b = b[k];
//         reused.k = k;
//         yield reused;
//       }
//     };
//     return reused;
//   }
// };

// Common case: transforming two graphs is special case of transforming one, where the reducer derives
// a third graph while walking. The derived graph's nodes are pairs of [ANode,BNode]
// TODO more efficient (i.e. non-array resizing) queue implementation
// some initial research led to https://github.com/invertase/denque
// const noopGraphReducer = (acc, currentNode, addNextNode = (nodes = []) => []) => acc;
// export const reduceGraphBF = (reducer = noopGraphReducer, startNodes = []) => {
//   const queue = [...startNodes];
//   const addNextNode = node => { queue[queue.length] = node; }
//   let acc, node;
//   while (node = queue.shift()) (acc = reducer(acc, node, addNextNode));
//   return acc;
// };
