import indexSchema,{getFieldTypeName} from './indexSchema'
import {not,reduce,transToObject,isString,hasKey,isObjectLike,isInteger,or,cond,identity,isArray,and,stubTrue,diffBy, tdMap, tdFilter, tdDPipeToArray, toPredicate,scan, diffObjs, tdToObject, tdToObjectImmutable, tdReduce, transduceDF, tdMapKey, memoize, over, pick,ensureArray, tdLog,compose, mapToObject, pipe, tdTap, overObj,transArrayToObject,transObjectToObject} from '@a-laughlin/fp-utils';
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

export const schemaToStateOpsMapper=(
  schema=gql('type DefaultType {id:ID!}')
)=>( ops=defaultActions )=>{
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

const getArgsPopulator = vars=>transToObject((result,{name:{value:name},value})=>{
  if(value.kind==='Variable'){ result[name]= vars[value.name.value]; }
  else if (value.kind==='ObjectValue') {
    // todo, figure out what about the structure made the recursive call not work
    // else if (value.kind==='ObjectValue') result[name]=populateArgsFromVars(value.fields,vars)
    result[name]=transToObject((o,f)=>{
      o[f.name.value]=f.value.value;
    })(value.fields);
  }
  else result[name] = value.value;
});
const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>{
  let vars = {},name,defaultValue;
  // default per spec is returning only what's in variableDefinitions, but this eliminates the duplicate definitions in each query to pass a variable, given it's usually specified in the schema already.  Can always change it to the more verbose version and add validation if necessary.
  if (variableDefinitions.length===0) return passedVariables;
  for ({variable:{name:{value:name}},defaultValue} of variableDefinitions)
  vars[name]=passedVariables[name]??((defaultValue??{}).value);
  return vars;
};
// filtering language ... a dsl is complicated https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// for mvp mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter
export const getObjectQuerier=( schema, queryMatchers={ filter:toPredicate, omit:x=>not(toPredicate(x))} )=>{
  const mapItem=([v,rootState,collMeta,Field,getArgs],id)=>transObjectToObject((o,f)=>{
    const k=f.name.value;
    const fieldMeta=collMeta[k];
    o[k]=fieldMeta.defKind==='scalar'
      ? rootState[collMeta.defName][id][k]
      : fieldMeta.isList
        ? mapCollection([transArrayToObject((o,i)=>o[i]=rootState[fieldMeta.rel.defName][i])(v[k]),rootState, fieldMeta.rel, f, getArgs],v[k])
        : mapItem([rootState[fieldMeta.rel.defName][v[k]],rootState, fieldMeta.rel, f, getArgs],v[k]);
  })(Field.selectionSet.selections);
  
  const mapCollection=([v,rootState,cMeta,Field,getArgs],id)=>{
    const args = getArgs(Field.arguments);
    const argIds = ensureArray(args[cMeta._idKey]);
    if(argIds.length) v=transArrayToObject((o,i)=>o[i]=v[i])(argIds);
    const queryMatcherFns=tdDPipeToArray( args, tdFilter((_,k)=>k in queryMatchers), tdMap((_,k)=>queryMatchers[k](args[k])) );
    const matchesFn = queryMatcherFns.length===0 ? queryMatchers.filter(args) : and(...queryMatcherFns);
    return transObjectToObject((o,item,k)=>matchesFn(item)&&(o[k]=mapItem([item,rootState,cMeta,Field,getArgs],k)))(v);
  }
  
  const isScalarField=([v,rootState,meta,Field,getArgs],id)=>(meta[Field.name.value]??meta).defKind==='scalar';
  const isObjectField=([v,rootState,meta,Field,getArgs],id)=>(meta[Field.name.value]??meta).defKind==='object';
  const isListField=([v,rootState,meta,Field,getArgs],id)=>meta.isList;
  const isPrimitiveValue=([v,rootState,collName,Field,getArgs],id)=>!isObjectLike(v);
  const isObjectValue=([v,rootState,collName,Field,getArgs],id)=>isObjectLike(v);
  const isItemValue=([v,rootState,meta,Field,getArgs],id)=>isObjectLike(v)&&meta._idKey in v;
  const isCollectionValue=([v,rootState,meta,Field,getArgs],id)=>isObjectLike(v) && !(meta._idKey in v);
  const mapSelection=cond([
    [isScalarField,cond([
      [isObjectValue,()=>new Error('cannot request object without selecting fields')],
      [isPrimitiveValue,([v])=>v]
    ])],
    [isObjectField,cond([
      [isPrimitiveValue,([v,_,{defName}],id)=>new Error(`cannot request fields of a primitive ${JSON.stringify({v,id,defName},null,2)}`)],
      [isItemValue,mapItem],// item (worth noting that root state is also an item with no key, given its heterogenous values);
      [isCollectionValue,mapCollection],
    ])],
  ]);
  
  const {selectionMeta}=indexSchema(schema);
  const mapQuery= (query,passedVariables={})=>{
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
    const selections=query.definitions[0].selectionSet.selections;
    return rootState=>transToObject((o,s)=>o[s.name.value]=mapSelection([rootState[s.name.value],rootState,selectionMeta[s.name.value],s,argsPopulator],undefined))(selections);
  };
  return mapQuery;
};


export const getUseQuery=(store,querier,schema,useState,useEffect)=>{
  
  const {definitionsByName,selectionMeta}=indexSchema(schema);
  const getFieldCollectionNames=reduce((acc=new Set(),{name:{value},selectionSet:{selections=[]}={}},i,c)=>{
    if (value in definitionsByName) acc.add(value);
    for (const s of selections)getFieldCollectionNames(acc,s);
    return acc;
  });

  // const getVarsKey = vars=>JSON.stringify(Object.keys(vars).sort().reduce((a,k)=>{a[k]=vars[k];return a;},{}));
  // const opVarsIdx=new WeakMap();
  const opKeyIdx=new WeakMap();
  return (query,variables)=>{
    !opKeyIdx.has(query) && opKeyIdx.set(query,Array.from(getFieldCollectionNames(query.definitions.flatMap(d=>(d.selectionSet.selections)))));
    const [state,setState] = useState([store.getState(),querier(store.getState(),query,variables)]);
    useEffect(()=>store.subscribe(()=> { // returns the unsubscribe function
      setState(([prevNormed,prevDenormed])=>{
        // TODO different tests for collection/item/value
        // if variables changed, or key changed
        const normed = store.getState();
        // const changedKeys=opKeyIdx.get(query).filter(k=>prevNormed[k]!==normed[k]);
        // if (changedKeys.length===0) return [prevNormed,prevDenormed];
        const denormed=querier(normed,query,variables);
        for (const k of changedKeys){
          if(selectionMeta[k]){
            for (const kk in denormed){
              if (typeof normed[kk]!==typeof prevNormed[kk]) return [normed,denormed];
            }
            for (const kk in prevDenormed){
              if (typeof normed[kk]!==typeof prevNormed[kk]) return [normed,denormed];
            }
          } else {
            if(prevNormed[k]!==normed[k])return [normed,denormed];
          }
        }
        return [prevNormed,prevDenormed];
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
