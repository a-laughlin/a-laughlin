import indexSchema from './indexSchema'
import {isFunction,isObjectLike,not,reduce,transX,transToObject,cond,identity,isArray,and,stubTrue,diffBy, filterToArray, transToArray, omitToArray, tdMap, tdFilter, tdDPipeToArray, tdTap} from '@a-laughlin/fp-utils';
import _matchesProperty from 'lodash-es/matchesProperty'
import _matches from 'lodash-es/matches';
import _property from 'lodash-es/property';
import { isObject } from 'util';

export const extendSchemaWithQueryAndMutationDefinitions=( schema )=>{};

// normalize collectionTree,ArrayTree,item,value
// normalize tree,set,value
// given id,array of ids, single item, collection of items, array of items
const schemaToActionNormalizers=schema=>{
  const {objectFieldMeta,definitionsByName}=indexSchema(schema);
  const notJSObject = action=>action.payload===null||typeof action.payload!=='object';
  return transToObject((o,_,dName)=>{
    const notGQLObject = action=>!(dName in objectFieldMeta);
    
    const idKey=objectFieldMeta[dName]?.idKey;
    o[dName] =  cond(
      // leave scalars and other non-object types
      [notGQLObject,identity],
      // convert number/string id to collection
      [notJSObject,(action)=>({...action,payload:{[action.payload]:{[idKey]:action.payload}}})],
      // convert single item to collection
      [action=>idKey in action.payload,
        action=>({...action,payload:{[action.payload[idKey]]:action.payload}})],
      // convert array to collection
      [isArray,transToObject((o,v)=>{
        v=normalizePayload(v);
        o[v[idKey]]=v;
      })],
      // collection, leave as is
      [stubTrue,identity]
    );
  })(definitionsByName);
}


const keyDiff=(v,k)=>k;
export const schemaToStateOpsMapper=(
  schema = gql('type DefaultType {id:ID!}')
)=>(
  ops={
    ADD:nextReducer=>(prevState,action)=>{
      // if collection
      // if item
      // if value
      // which has a simpler dependency graph topology?  These fns, handling different types, or or a mutation tree?
      // note: I can make these property functions, like "filter" and "omit" on query
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
    GET:nextReducer=>(prevState,action)=>nextReducer(prevState,action),
    // ADD_TREE=(prevState,payload,idKey)=>{...prevState,...normalizePayload(payload)},
    // SUBTRACT_TREE=(prevState,payload,idKey)=>return {...prevState,...payload},
    // UNION_TREE=(prevState,payload,idKey)=>return {...prevState,...payload},
    // INTERSECTION_TREE=(prevState,payload,idKey)=>return {...prevState,...payload},
    // SET_TREE=(prevState,payload,idKey)=>return {...prevState,...payload},
    // GET_TREE=(prevState,payload,idKey)=>return {...prevState,...payload},
  }
)=>{
  // const transduce = (initial,finalReducer,transducer,val)
  return transToObject((acc,actionNormalizer,dName)=>{
    const opFns=transToObject((o,opFn,OP)=>o[`${OP}_${dName.toUpperCase()}`]=opFn(identity))(ops)
    acc[dName]=(prevState=null,action={})=>{
      return action.type in opFns
        ? opFns[action.type](prevState,actionNormalizer(action))
        : prevState;
    }
  })(schemaToActionNormalizers(schema));
};

// const isJSObject = action=>action.payload!==null && typeof action.payload==='object';
// const isJSArray = action=>Array.isArray(action.payload);
// const isGQLObject = x=>dName in objectFieldMeta;
// const isState = action=>cName in action.payload;
// const isStateCollection = action=>cName in action.payload;
// const isStateItem = action=>idKey in action.payload;
// const isStateValue = x=>objectFieldMeta[dName]===undefined;
// state,collection,item,value need to vary for these, or just assume we'll know the shape and choose the
// appropriate fn when writing the filter? // let's see how it works
const filterIteratees = cond(
  [isFunction,pred=>v=>pred(v)],
  [isArray,_matchesProperty],
  [isObjectLike,_matches],
  [stubTrue,k=>v=>k in v],
);
export const getMemoizedObjectQuerier=(
  schema,
  queryMatchers={
    // filtering language ... not sure whether to go this far, or use functions...
    // use functions to make it extensible...  transducers?
    // https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
    // or mimic lodash iteratee with filter and omit
    // https://lodash.com/docs/4.17.15#filter
    // where Person(id:"a") is equivalent to filter({id:"a"})
    filter:filterIteratees,
    omit:fn=>filterIteratees(not(fn))
  }
)=>{
  const {objectFieldMeta,definitionsByName}=indexSchema(schema);

  const populateArgsFromVars = (args=[],vars={})=>{
    let result={},name,kind,value;
    for ({name:{value:name},value} of args){
      if(value.kind==='Variable'){ result[name]= vars[value.name.value]; }
      else if (value.kind==='ObjectValue') {
        // todo, figure out what about the structure made the recursive call not work
        // else if (value.kind==='ObjectValue') result[name]=populateArgsFromVars(value.fields,vars)
        result[name]=transToObject((o,f)=>{
          o[f.name.value]=f.value.value;
        })(value.fields);
      }
      else result[name] = value.value;
      // may need to delist and denull here
    }
    return result;
  };
  const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>{
    let vars = {},name,defaultValue;
    // default per spec is returning only what's in variableDefinitions, but this eliminates the duplicate definitions in each query to pass a variable, given it's usually specified in the schema already.  Can always change it to the more verbose version and add validation if necessary.
    if (variableDefinitions.length===0) return passedVariables;
    for ({variable:{name:{value:name}},defaultValue} of variableDefinitions)
      vars[name]=passedVariables[name]!==undefined ? passedVariables[name] : defaultValue?.value;
      // may need to de-null and de-list here.f
    return vars;
  };

  const queryObjectCollection = ( (rootState,collName,id,Field,vars)=>{
    if (Field.selectionSet===undefined){ // leaf
      if (id===undefined){
        return (Field.name.value in rootState)
          ? rootState[Field.name.value] // root scalars
          : new Error('cannot request collection without selecting fields');
      }
      if(Field.name.value in objectFieldMeta[collName].collectionNames)
        return new Error('cannot request object without selecting fields');
      return rootState[collName][id][Field.name.value]; // prop scalars
      // return new Error('just get the property selection')
    }
    if (id === undefined){
      // what if we're filtering the collection
      if (Field.arguments.length===0)
        return transToObject((o,_,k)=>o[k]=queryObjectCollection(rootState,collName,k,Field,vars))(rootState[collName]);

      const args = populateArgsFromVars(Field.arguments,vars);

      const queryMatcherFns=tdDPipeToArray(
        args,
        // tdTap((a,v,k,c)=>console.log('before',a,v,k,c)),
        tdFilter((v,k)=>k in queryMatchers),
        tdMap((v,k)=>queryMatchers[k](args[k])),
        // tdTap((a,v,k,c)=>console.log('after',a,v,k,c)),
      );
      queryMatcherFns[0]||(queryMatcherFns[0]=queryMatchers.filter(args));
      const matchesFn = and(...queryMatcherFns);

      return transToObject(
        (o,item,k)=>matchesFn(item)&&(o[k]=queryObjectCollection(rootState,collName,k,Field,vars))
      )(rootState[collName]);
    }
    const {collectionNames}=objectFieldMeta[collName];
    if (Array.isArray(id))
      return transToObject((o,k)=>o[k]=queryObjectCollection(rootState,collName,k,Field,vars))(id);

    let f,fName,newItem={},item=rootState[collName][id];
    for (f of Field.selectionSet.selections){
      fName=f.name.value;
      newItem[fName]=(fName in collectionNames)
        ? queryObjectCollection( rootState, collectionNames[fName], item[fName],f, vars)
        : item[fName];
    }
    return newItem;
  });
  const getVarsKey = vars=>{
    const keys=Object.keys(vars).sort();
    return keys.join(',') + keys.map(k=>JSON.stringify(vars[k])).join(',');
  };

  const queryStateWithOperation = (rootState,operation,passedVariables={})=>
    operation.definitions.reduce((result,op)=>{
      const vars = variableDefinitionsToObject(op.variableDefinitions,passedVariables);
      for (const s of op.selectionSet.selections||[])
        result[s.name.value]=queryObjectCollection(rootState,s.name.value,undefined,s,vars);
      return result;
    },{});

  const getFieldCollectionNames=reduce((acc,{name:{value},selectionSet:{selections=[]}={}},i,c)=>{
    if (value in definitionsByName) acc.add(value);
    return getFieldCollectionNames(selections,acc);
  });

  const getQueryCollectionNames = reduce((acc=new WeakSet(),{selectionSet:{selections=[]}={}})=>getFieldCollectionNames(selections,acc));
      
  let prevState={};
  let operations=new WeakSet();
  let queryResults=new WeakMap();
  let collectionKeysByQuery=new WeakMap();
  return (state,operation,vars={})=>{
    const varsKey=getVarsKey(vars);
    if (!operations.has(operation)){
      operations.add(operation);
      collectionKeysByQuery.set(operation,getQueryCollectionNames(operation.definitions,new Set()));
      const result = queryStateWithOperation(state,operation,vars);
      queryResults.set(operation,{[varsKey]:result});
      prevState=state;
      return result;
    }

    if (prevState!==state)
      for (const k of collectionKeysByQuery.get(operation))
        if(prevState[k]!==state[k]){
          prevState=state;
          return queryResults.get(operation)[varsKey] = queryStateWithOperation(state,operation,vars);
        }
    
    const opResults=queryResults.get(operation);
    return varsKey in opResults
      ? opResults[varsKey]
      : (opResults[varsKey] = querier(state,operation,vars));
  }
}
// acc[dName]=(prevState=null,action={type:GET,payload:{}})=>{
//   let {type=GET,payload={}}=action;
//   if (type===GET) return prevState;

//   if (type===SET) return payload;
  
//   if(idKey===undefined)return prevState;
//   if(payload===null)return prevState;
//   if (typeof payload !== 'object') payload={[payload]:{[idKey]:payload}}; // convert number to collection shape
//   else if (idKey in payload) payload={[payload[idKey]]:payload}; // convert item to collection shape
//   else if(Array.isArray(payload))
  
//   if (type===ADD) return {...prevState,...payload};
  
//   const diff = collDiffer([prevState,payload]);
//   let nextState={},k;
  
//   if (type===SUBTRACT) {
//     if (diff.aibc===0) return prevState; // no intersection to remove
//     if (diff.aibc===diff.aubc) return nextState; // complete intersection. remove everything
//     for (k in diff.anb)nextState[k]=prevState[k]; // copy non-intersecting collection items to new state
//     return nextState;
//   }
  
//   if (type===UNION){
//     for (k in diff.aub)nextState[k]=payload[k]??prevState[k];
//     return diff.changedc===0?prevState:nextState;
//   }
  
//   if (type===INTERSECTION){
//     for (k in diff.aib)nextState[k]=payload[k];
//     return diff.changedc===0?prevState:nextState;
//   }
//   // select partial collections to update?
//   // select partial trees to update (mutation syntax)??
//   // how compose directives handlers, like boundary values?
//   // denormalize
//   // normalize
//   return prevState;
// };
// return acc;







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

// export const EitherValueOrError = fn => resolverArg => {
//   try { return fn(resolverArg) }
//   catch (e) {
//     return { ...resolverArg }
//   };
//   if (arg instanceof Error) return fn(arg)
// }
// export const EitherValuePromiseOrWonkaStream = (arg, fn) => {
//   if (typeof arg === 'function') return toPromise(arg).then(fn, fn);
//   if (typeof arg === 'object' && typeof arg.then === 'function') return arg.then(fn, fn);
//   return fn(arg);
//   try { return fn(arg) }
//   catch (e) { return catcher(e) };
// }
// const EitherValuePromiseOrStream = (fn) => {
//   if (typeof arg === 'object' && typeof arg.then === 'function') return arg.then(fn, catcher);
//   if (typeof arg === 'function') return toPromise(arg).then(fn, catcher);
//   if (typeof arg === 'object' && typeof arg.then === 'function') return arg.then(fn, catcher);
//   try { return fn(arg) }
//   catch (e) { return catcher(e) };
// }

// const astReducers={
//   Document:({definitions=[]})=>definitions,
//   OperationDefinition:({selectionSet:{selections=[]}={}}={})=>selections,
//   Field:({selectionSet:{selections=[]}={}}={})=>selections,
// };
// // get rid of the transducers for the recursive stuff
// const queryReducer=(rArg,fn)=>{
//   fn(rArg);
//   for (const c of astReducers[rArg.astNode.kind](rArg.astNode))
//     queryReducer(fn,makeResolverArg({parent:rArg,astNode:c}));
//   return rArg;
// };

// export const makeAstKindTransducers=(key,reader,writer)=>{
//   const titledKey=key[0].toUpperCase()+key.slice(1);
//   const result={};
//   reader && (result['read'+titledKey] = nextReducer=>(parent,ra)=>{
//     reader(parent,ra);
//     ra.outputArray[ra.outputArray.length]=ra.context[key];
//     nextReducer(parent,ra);
//     return parent;
//   });
//   writer && (result['write'+titledKey] = nextReducer=>(parent,ra)=>{
//     writer(parent,ra);
//     nextReducer(parent,ra);
//     return parent;
//   });
//   return result;
// }

// export const readData = nextReducer=>(parent,ra)=>{
//   if(ra===parent) {
//     parent.context.data=parent.data;
//   } else {
//     parent.context.data[ra.nameValue]||(parent.context.data[ra.nameValue]={});
//     ra.context.data=parent.context.data[ra.nameValue];
//   }
//   // if(ra.nameValue in (parent.context.data)){
//   //   ra.context.data=parent.context.data[ra.nameValue];
//   //   ra.outputArray[ra.outputArray.length]=ra.context.data;
//   // } else {
//   //   parent.context.data[ra.nameValue]=ra.context.data={};
//   // }
//   nextReducer(parent,ra);
//   return parent;
// }
// export const writeData = nextReducer=>(parent,ra)=>{
//   if (parent===ra){
//     ra.data=ra.context.data||{};
//   }
//   if (ra.outputArray.length){
//     ra.context.data=ra.outputArray[ra.outputArray.length-1]
//   }
//   if (ra.context.data){
//     if(ra!==parent){
//       parent.context.data||(parent.context.data={});
//       parent.context.data[ra.nameValue]=ra.context.data;
//     } else {
//       parent.data=parent.context.data;
//     }
//   }
//   nextReducer(parent,ra);
//   return parent;
// };

// export const stateTransducersFactory = (initialState={})=>{
//   let state = {...initialState};
//   return makeAstKindTransducers('state',
//     (parent,ra)=>{
//       if (ra===parent){
//         ra.context.state = parent.context.state = state;
//       } else {
//         ra.context.state=parent.context.state[ra.nameValue]??parent.context.state;
//       }
//         // ? state
//         // : parent.context.state[ra.nameValue];
//       return parent;
//     },
//     (parent,ra)=>{
//       parent===ra
//         ? (state!==ra.context.state && (state=ra.context.state))
//         : (ra.context.state=ra.outputArray[ra.outputArray.length-1]);
//       return parent;
//     },
//   );
// };

// export const schemaToResolverMap=(schema)=>{
//   const definitionsByName={
//     ...keyBy(s=>s)(
//       'ID,Int,Float,String,Boolean'
//         .split(',')
//         .map(s=>({[s]:{kind:"ScalarTypeDefinition",name:{value:s}}}))
//     ),
//     ...keyBy(d=>d.name.value)(schema.definitions)
//   };
//   const kindTransducers={
//     ScalarTypeDefinition:nextReducer=>ra=>nextReducer(ra),
//     // queryReducer(makeResolverArg({astNode:c,parent:resolverArg}))
//     ObjectTypeDefinition:nextReducer=>ra=>transduce(ra,kindTransducers.FieldDefinition,nextReducer,ra.astNode.fields),
//     FieldDefinition:nextReducer=>ra=>transduce(ra,kindTransducers[ra.type.kind],nextReducer,ra.astNode.fields),
//     NonNullType:nextReducer=>ra=>transduce(ra,kindTransducers[ra.type.kind],nextReducer,{...ra.astNode,type:ra.astNode.type.type}),
//     ListType:nextReducer=>ra=>transduce(ra,kindTransducers[ra.type.kind],nextReducer,ra.astNode.fields),
//     NamedType:nextReducer=>ra=>{
//       console.log(`definitionsByName[ra.astNode.name.value].kind`, definitionsByName[ra.astNode.name.value].kind);
//       if (namedTransducers[ra.astNode.name.value]===undefined)
//         namedTransducers[ra.astNode.name.value] = kindTransducers[definitionsByName[ra.astNode.name.value].kind];
//       return transduce(ra,namedTransducers[ra.astNode.name.value],nextReducer,ra);
//     },
//   };
//   const namedTransducers  = tdToObject(tdMap(({kind})=>kindTransducers[kind]))(definitionsByName);
//   return namedTransducers;
// }
//
// export const maybePromise = (arg, onSuccess) => {
//   if (typeof arg==='object'&&arg.then) return arg.then(onSuccess);
//   return onSuccess(arg);
// };
//
// export const flowPossiblePromises = (...fns) => arg => fns.reduce(maybePromise, arg);
//
// export const mapToPossiblePromise = (array, fn) => {
//   let x, result, hasPromises;
//   const vals = [];
//   vals.hasPromises=false;
//   for (x of array) {
//     result = fn(x)
//     if (result.then) vals.hasPromises = true;
//     vals[vals.length] = result;
//   }
//   return hasPromises ? Promise.all(vals) : vals;
// }

// type IdentityType = <T>(arg: T) => T;
// interface IdentityType { <T>(arg: T): T };
// interface IdentityType<T> { (arg: T): T };
// define type and identity
// const identity: (<T>(x: T) => T) = x => x;
// function identity<T>(x: T): T { return x; }
// const hasProp = (prop: string) => (x: object | function): bool => prop in x;
// const isString = (x): bool => typeof x === 'string';
// const isArray = (x): bool => Array.isArray(x);
// const isUndefined = (x): bool => x === undefined;
// const isNull = (x): bool => x === null;
// const isJSMap = (x): bool => x instanceof Map;
// const mapArray = (f: ItemMapper) => (c: array): array => c.map(f);
// const mapObject = (f: ItemMapper) => { };


// const getType = (x: null | undefined | array | function | number | string | object): string => {
//   if (x === null) return 'null';
//   if (x === undefined) return 'undefined';
//   if (Array.isArray(x)) return 'array';
//   if (x instanceof Function) return 'function';
//   if (x instanceof Number) return 'number';
//   if (x instanceof String) return 'string';
//   if (x instanceof Error) return 'error';
//   if (typeof x === 'object') return 'object';
//   return 'object';
// };
// const isEmpty: Predicate = (x: null | undefined | array | function | number | string | object): boolean => {
//   if (x === null) return true;
//   if (x === undefined) return true;
//   if (Array.isArray(x)) return x.length === 0;
//   if (x instanceof Function) return false;
//   if (x instanceof Number) return x === 0;
//   if (x instanceof String) return x === '';
//   if (typeof x === 'object') return Object.keys(x).length === 0;
//   return false;
// };

// const Just = x => ({
//   map: f => x => Just(f(x)),//
//   flatMap: f => x => f(x),
//   chain: f => x => f(x),
//   extract: () => x,
//   ap: anotherMonad => map(anotherMonad)(x),
//   isEmpty: () => false,
//   inspect: () => `Just(${x})`
// });
// const Nothing = x => ({
//   map: Nothing,
//   flatMap: f => x => f(undefined),
//   chain: f => x => f(undefined),
//   extract: () => undefined,
//   ap: Nothing,
//   isEmpty: () => true,
//   inspect: () => "Nothing",
//   // hylo:()=>{},
//   // hylo:()=>{},
// });
//
// const Identity = x => ({
//   // Transform the inner value
//   // map :: Identity a ~> (a -> b) -> Identity b
//   map: f => Identity(f(x)),
//   flatMap: f => x => f(x),
//   chain: f => x => f(x),
//   ap: anotherMonad => map(anotherMonad)(x),
// });
//
// const Lens = x => ({
//
// });
// const Transducer = x => ({
//
// });
//
// const ifElse = (pred, ifTrue, ifFalse) => x => (pred(x) ? ifTrue : ifFalse)(x);
// const Maybe = ifElse(isEmpty, Nothing, Just);
// const maybeProp = prop => compose(prop[x])prop=> (x = {}) => Maybe(x[prop]);
//
//
// type Just;
// type Nothing;
// type Maybe = Just | Nothing;
// export const EitherValOrError = {
//   map: f => x => x instanceof Error ? x : f
//   empty: x =>
//     of: x=> EitherValOrError
// }
// export const transducer
//
// export const lens = getter => setter => { };

  // resolverArg.writes.data = resolverArg.data??{};
//   const parent = resolverArg.parent;
//   let name;
//   if (resolverArg.kind==='OperationDefinition'){
//     nextReducer(resolverArg);
//
//     ||resolverArg.astNode.operation;
//   } else if (resolverArg.kind==='Field'){
//     name = resolverArg.astNode.name.value;
//     resolverArg.reads[resolverArg.readsIndex++] = resolverArg.writes.data = resolverArg.data;
//   }
//   return nextReducer(resolverArg);
//
//     // parent.data=parent.writes.data={...parent.writes.data,[name]:resolverArg.resolverOutput};
//   }
//   return nextReducer(resolverArg);
//   // switch (resolverArg.astNode.kind){
//   //   case 'OperationDefinition':
//   //     return nextReducer(resolverArg);
//   //   case 'Field':
//   //     if (parent.writes.data[name]!==resolverArg.resolverOutput){
//   //       resolverArg.writes.data=resolverArg.resolverOutput;
//   //       parent.data=parent.writes.data={...parent.writes.data,[name]:resolverArg.resolverOutput};
//   //     }
//   //     return nextReducer(resolverArg);
//   //   default :
//   //     return nextReducer(resolverArg);
//   // }
// };
// reads data and state from ra.writes{data,state,variables,arguments}

// 6.1.2 http://spec.graphql.org/draft/#sec-Coercing-Variable-Values
// const readVariables=makeAstKindTransducers({ // eslint-disable-line no-unused-vars
//
//   Field:ra=>{
//     const resolver = ra.parent.writes.resolver[ra.astNode.name.value]
//     if (resolver!==undefined){
//       ra.writes.resolver = resolver[ra.IO]||resolver;
//     }
//   }
// });

// 6.4.1 http://spec.graphql.org/draft/#sec-Coercing-Field-Arguments
// const readArguments=nextReducer=>(resolverArg)=>{nextReducer(resolverArg)}; // eslint-disable-line no-unused-vars


// export const resolverTransducerFactory = resolverMap=>{
//   const readResolver = makeAstKindTransducers({
//     OperationDefinition:ra=>{
//       if (resolverMap[ra.astNode.operation]===undefined){
//         console.log(`"${ra.astNode.operation}" missing from resolver map`);
//         return ra;
//       }
//       ra.writes.resolver=resolverMap[ra.astNode.operation];
//       return ra;
//     },
//     Field:ra=>{
//       console.log(`readResolver ra`, ra);
//       const resolver = ra.parent.writes.resolver[ra.astNode.name.value]
//       if (resolver!==undefined){
//         ra.writes.resolver = resolver[ra.IO]||resolver;
//       }
//     }
//   });
//   return {readResolver};
// };

// const makeLens = lens => {
//   // freeze the lens to to prevent composing lenses from accidentally redefining its fns
//   // ensure functions defined for all crawlable kinds
//   const frozen = Object.freeze(lens);
//   return exchangeKey => frozen;
// }
//
// // TODO evaluate if removing makeLensFactory's conditionals is possible
// // without making a bunch of extra api functions to learn
// const makeLensFactory = getLens => {
//   let cache;
//   return userDefinedData => {
//     if (cache === undefined) {
//       if (userDefinedData === undefined) throw new Error('First lens factory call must supply initial data.');
//
//       // Cache cache. Prevents redefinition so composing lenses calling this factory
//       // can access shared exchange and client-level data. Also fun to say.
//       cache = stubObject();
//     }
//
//     return (key = '__client__') => {
//       if (cache[key]) return cache[key];
//       // freeze the lens to to prevent composing lenses from accidentally redefining its fns
//
//       // ensure functions defined for all crawlable kinds to prevent errors further down the chain
//       const lens = Object.freeze(getLens(userDefinedData));
//       // prevent non-instantiated factories from creating super-difficult-to-trace bugs.
//       if (typeof key === 'object') {
//         throw new Error(`lensFactory missing userDefinedData for ${lens}.`)
//       }
//       // cache the lense with its closured userDefinedData for composing lens' "read" calls
//       return (cache[key] = lens);
//     };
//   }
// }
//
// //
// // FragmentSpread
// // https://graphql.github.io/graphql-spec/June2018/#index
// const identity = resolverArg => resolverArg;
// export const fragments = () => ({
//   // Document: { read: identity, write: identity },
//   // needs typedefs
//   FragmentSpread: { read: identity, write: identity },
//   FragmentDefinition: { read: identity, write: identity },
//   InlineFragment: { read: identity, write: identity },
// });
// export const fields = () => ({
//   // Document: { read: identity, write: identity },
//   // needs typedefs
//   OperationDefinition: { read: identity, write: identity },
//   Field: { read: identity, write: identity },
// });
// export const arguments = () => ({
//   Field: { read: f => transArrayToObj((o, v, k) => { o[v.name.value] = v.value.value })(f.arguments) }
// });
// export const alias = () => ({
//   // Document: { read: identity, write: identity },
//   Field: { read: identity, write: identity },
// });
// export const directives = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const state = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const data = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const context = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const info = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const errors = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const preventForward = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const returnOp = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const typeValidation = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
// export const nullability = () => ({
//   operation: { read: identity, write: identity },
//   definition: { read: identity, write: identity },
//   selection: { read: identity, write: identity },
// });
