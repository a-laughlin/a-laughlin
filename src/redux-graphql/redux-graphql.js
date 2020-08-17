import indexSchema,{getFieldTypeName} from './indexSchema'
import {not,reduce,transToObject,isString,hasKey,isObjectLike,isInteger,or,cond,identity,isArray,and,stubTrue,diffBy, tdMap, tdFilter, tdDPipeToArray, toPredicate,scan, diffObjs, tdToObject, tdToObjectImmutable, tdReduce, transduceDF, tdMapKey, memoize} from '@a-laughlin/fp-utils';
import { map } from 'lodash-es';
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
  const {objectFieldMeta,definitionsByName}=indexSchema(schema);
  const actionNormalizers = transToObject((o,_,dName)=>{
    const notGQLObject = payload=>!(dName in objectFieldMeta);
    const idKey=(objectFieldMeta[dName]??{}).idKey;
    const normalizePayload=cond(
      // leave scalars and other non-object types
      [notGQLObject,identity],
      // convert number/string id to collection
      [isString,payload=>({[payload]:{[idKey]:payload}})],
      // convert number/string id to collection
      [isInteger,payload=>({[payload]:{[idKey]:`${payload}`}})],
      // convert array to collection
      [isArray,transToObject((o,v)=>{
        v=normalizePayload(v);
        o[v[idKey]]=v;
      })],
      // convert single item to collection
      [and(isObjectLike,hasKey(idKey)), payload=>({[payload[idKey]]:payload})],
      // collection, leave as is
      [stubTrue,identity]
    );
    o[dName] = normalizePayload;
  })(definitionsByName);
  
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
  // may need to de-null and de-list here.f
  return vars;
};
// filtering language ... a dsl is complicated https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// for mvp mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter
const tdMapField=mapper=>nextReducer=>(a,field,k,...c)=>nextReducer(a,mapper(field,field.name.value,...c),field.name.value,...c);

export const getObjectQuerier=( schema, queryMatchers={ filter:toPredicate, omit:x=>not(toPredicate(x))} )=>{
  const {objectFieldMeta,definitionsByName,ScalarTypeDefinition}=indexSchema(schema);
  const queryCollection = (rootState,collName,id,Field,populateArgsFromVars)=>{
    if (Field.selectionSet===undefined){ // leaf
      if (id===undefined) return (collName in rootState) ? rootState[collName] : new Error('cannot request collection without selecting fields');
      if(Field.name.value in objectFieldMeta[collName].collectionNames) return new Error('cannot request object without selecting fields');
      return rootState[collName][id][Field.name.value]; // prop scalars
    }
    if (id === undefined){
      // what if we're filtering the collection
      if (Field.arguments.length===0)
        return transToObject((o,_,k)=>o[k]=queryCollection(rootState,collName,k,Field,populateArgsFromVars))(rootState[collName]);

      const args = populateArgsFromVars(Field.arguments);

      const queryMatcherFns=tdDPipeToArray(
        args,
        tdFilter((v,k)=>k in queryMatchers),
        tdMap((v,k)=>queryMatchers[k](args[k])),
      );
      queryMatcherFns[0]||(queryMatcherFns[0]=queryMatchers.filter(args));
      const matchesFn = and(...queryMatcherFns);

      return transToObject(
        (o,item,k)=>matchesFn(item)&&(o[k]=queryCollection(rootState,collName,k,Field,populateArgsFromVars))
      )(rootState[collName]);
    }
    const {collectionNames}=objectFieldMeta[collName];
    if (Array.isArray(id))
      return transToObject((o,k)=>o[k]=queryCollection(rootState,collName,k,Field,populateArgsFromVars))(id);

    let f,fName,newItem={},item=rootState[collName][id];
    for (f of Field.selectionSet.selections){
      fName=f.name.value;
      newItem[fName]=(fName in collectionNames)
        ? queryCollection( rootState, collectionNames[fName], item[fName],f, populateArgsFromVars)
        : item[fName];
    }
    return newItem;
  };
  // // parse the query once.  composing different lenses based on types?
  // const mapScalarField=([field,v,vPrev,root,rootPrev,typeName])=>v;
  // const mapCollectionField=([field,v,vPrev,root,rootPrev,typeName])=>{};
  // const isScalarField=([field,v,vPrev,root,rootPrev,typeName,getArgs])=>typeName in ScalarTypeDefinition;
  // const isCollectionField=([field,v,vPrev,root,rootPrev,typeName,getArgs])=>typeName in ObjectTypeDefinition;
  // const fieldMapper=cond(
  //   [isScalarField,mapScalarField]
  //   [isCollectionField,mapCollectionField]
  // );
  // return (query,passedVariables={})=>{
  //   const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  //   // const initialFieldMapper = tdToObjectImmutable(tdMapField(fieldMapper));
  //   // return (rootState,prevState=rootState)=>initialFieldMapper(
  //   //   query.definitions[0].selectionSet.selections.map(s=>[s,rootState[s.name.value],prevState[s.name.value],rootState,prevState,getFieldTypeName(s),argsPopulator])
  //   // )
  // };
  return (query,passedVariables={})=>{
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
    return (rootState,prevState=rootState)=>{
      return tdToObjectImmutable(
        tdMapField((v,k)=>queryCollection(rootState,k,undefined,v,argsPopulator))
        // tdMapField((v,k)=>queryCollection([rootState,prevState,rootState[k],prevState[k]],k,undefined,v,argsPopulator))
      )(query.definitions[0].selectionSet.selections);
    }
  };
}
export const getUseQuery=(store,querier,schema,useState,useEffect)=>{
  
  const {definitionsByName,objectFieldMeta}=indexSchema(schema);
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
          if(objectFieldMeta[k]){
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
