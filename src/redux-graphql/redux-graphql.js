// import omit from 'lodash/fp/omit';
import indexSchema from './indexSchema'
// import mapValues from 'lodash/mapValues';
import {isDeepEqual, mo,immutableTransObjectToObject,keyBy} from '@a-laughlin/fp-utils';
const identity = x => x;
export const memoize = (fn, by = identity) => {
  const mFn = (...x) => { const k = by(...x); return fn(...(mFn.cache.has(k) ? mFn.cache.get(k) : (mFn.cache.set(k, x) && x))) };
  mFn.cache = new WeakMap();
  return mFn;
};

export const schemaToQueryReducerMap=( schema = gql('type DefaultType {id:ID!}') )=>{
  return Object.entries(indexSchema(schema).objectFieldMeta).reduce((acc,[dName,{idKey}])=>{
    const collectionName=dName;
    const NAME=dName.toUpperCase();
    const [UNION,INTERSECTION,ADD,SUBTRACT,SET,GET]=['UNION','INTERSECTION','ADD','SUBTRACT','SET','GET']
      .map(OP=>`${OP}_${NAME}`);
    const collDiffer=diffBy(idKey);
    acc[collectionName]=(prevState,action={type:GET,payload:{}})=>{
      let {type,payload}=action;
      if (action.type===GET) return prevState;
      if (typeof type==='function')return type(prevState,payload);
      if (idKey in payload) payload={[payload[idKey]]:payload};
      if (type===SET) return payload;
      if (type===ADD) return {...prevState,...payload};
      const diff = collDiffer([prevState,payload]);
      let nextState={},k;
      if (type===SUBTRACT) {
        if (diff.aibc===diff.aubc) return nextState; // overlapping payload
        if (diff.anbc===diff.aubc) return prevState; // empty payload
        for (k in diff.anb)nextState[k]=prevState[k];
        return nextState;
      }
      if (type===UNION){
        for (k in diff.aub)nextState[k]=payload[k]??prevState[k];
        return diff.changedc===0?prevState:nextState;
      }
      if (type===INTERSECTION){
        for (k in diff.aib)nextState[k]=payload[k];
        return diff.changedc===0?prevState:nextState;
      }
      nextState = new Error(`type ${type} does not exist in ${dName} reducer map`);
      console.error(nextState);
      return nextState;
    };
    return acc;
  },{});
};

const getVarsKey = vars=>{
  const keys=Object.keys(vars).sort();
  return keys.join(',') + keys.map(k=>JSON.stringify(vars[k])).join(',');
};
export const propsChanged=(checkChangedIn={},toCheck={})=>{
  if (checkChangedIn===toCheck)return true;
  let key;
  for (key in toCheck) if (toCheck[key]!==checkChangedIn[key]) return true;
  return false;
}
export const schemaToMutationReducerMapMiddleware = schema=>{};
export const schemaToSubscriptionReducerMapMiddleware = schema=>{};
const autoGenerateSchemaQueriesAndMutations=()=>{}

export const getStateDenormalizingMemoizedQuery=(schema)=>{
  const {objectFieldMeta}=indexSchema(schema);
  const reducerMap = schemaToQueryReducerMap(schema);
  // no, the arrays will need to update when changed in norm
  // I don't even need to memoize a string. I can just memoize the collection, since it will change.
  // it will break when the args change
  
  // queryCollection(prevRootNorm,prevRootCollectionsDenorm,nextDenorm): memoized: collection unchanged and arguments(not vars) names/values unchanged, return collection result
  // Invariants:
  // If tree unchanged, collections unchanged
  // If collection unchanged props unchanged
  
  // queryNestedCollection: just memoizes nested collection outputs: key collectionName, collectionIdArray, arguments;
  // Invariants:
  // If idList unchanged, collection unchanged
  
  // queryNestedCollectionSubset: just memoizes nested collection outputs: key collectionName, collectionIdArray, arguments;
  // let normPrevRootState;
  // let denormPrevRootState;
  // Invariants:
  // If idList unchanged, and args.sort.tostring is unchanged, collection subset unchanged
  // // useQuery, memoize at point of use at point of use?
  // const {objectFieldMeta,definitionsByKind} = indexSchema(schema);
  // const reducerMap = schemaToQueryReducerMap(schema);
  // const {getState} = store;
  
  
  // will the relationships auto-update on mutation since denorm is by reference?
  const matches = args=>v=>{
    for (const arg in args)
      if(v[arg]!==args[arg])
        return false;
    return true;
  };
  const collectionFieldNameToCollectionName=(cName,fName)=>{
    reducerMap
  }
  const populateArgsFromVars = (args=[],vars={})=>{
    let result={},name,kind;
    for (const arg of args){
      name=arg.name.value;
      kind=arg.value.kind;
      if(kind==='Variable') result[name]=vars[name];
      else result[name]=arg[name]
    }
    return result;
  };
  const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>{
    let vars = {},name,defaultValue;
    // default per spec is returning only what's in variableDefinitions, but this eliminates the duplicate definitions just to pass a variable for less boilerplate.  Can always change it to the more verbose version and add validation.
    if (variableDefinitions.length===0)return passedVariables;
    for ({name:{value:name},defaultValue} of variableDefinitions)
      vars[name]=passedVariables[name]!==undefined?passedVariables[name]:defaultValue?.value;
      // may need to de-null and de-list here.
    return vars;
  };
  const queryCollectionItem = /* memoize */((item,selections,vars,itemFieldMeta,rootState)=>{
    let s,sName,scName,idKey,newItem={};
    for (s of selections){
      sName=s.name.value;
      scName=itemFieldMeta.collectionNames[sName]
      idKey=itemFieldMeta.idKey
      if (scName){
        newItem[sName]=queryCollection(
          {[item[sName]]:rootState[scName][item[sName]]},
          scName,
          s,
          vars,
          rootState
        )[item[sName]];
        // if isArray
      } else {
        newItem[sName]=item[sName];
      }
    }
    return newItem;
  });
  const queryCollection = /* memoize */((normedCollection,collectionName,Field,vars,rootState)=>{
    let selections=(Field.selectionSet||{selections:[]}).selections;
    if (selections.length===0)console.error(new Error('selections length is 0'));
    const itemFieldMeta=objectFieldMeta[collectionName];
    const args = populateArgsFromVars(Field.arguments,vars)
    const matchesArgs = matches(args);
    return immutableTransObjectToObject((a,item,id)=>{
      const isMatch = matchesArgs(item);
      if (isMatch===false) return;
      a[id]=queryCollectionItem(item,selections,vars,itemFieldMeta,rootState);
    })(normedCollection);
  });

  return  /* memoize */((rootState,operation,passedVariables={})=>{
    return operation.definitions.reduce((result,op)=>{
      const vars = variableDefinitionsToObject(op.variableDefinitions,passedVariables);
      for (const s of op.selectionSet.selections||[])
        result[s.name.value]=queryCollection(rootState[s.name.value],s.name.value,s,vars,rootState);
      return result;
    },{});
  });
}

/* eslint-disable @typescript-eslint/no-use-before-define */
/*
 * General Utils
 */
// import-free equivalent-lodash-function-named one-liners for-bundle-size
// see https://lodash.com/docs/ for descriptions and repl
// export const isArray = Array.isArray;
// export const isFunction = x => typeof x === 'function';
// export const stubArray = () => [];
// export const stubObject = () => Object.create(null);
// export const isPromise = x=>typeof x==='object'&&typeof x.then==='function';
// export const curryN = (n = 1, fn) => (...args) => (n <= args.length) ? fn(...args) : curryN(n - args.length, (...more) => fn(...args, ...more));
// // @ts-ignore: tslint dislikes these
// export const over = (fns = []) => (...args) => fns.map(f => f(...args));
// // @ts-ignore: tslint dislikes these
// export const keyBy = (by = x => x.id) => (a = []) => { const o = {}, l = a.length; let i = -1; while (++i < l) (o[by(a[i])] = a[i]); return o; }
// // @ts-ignore: tslint dislikes these
// export const flow = (fn = identity, ...fns) => (...args) => { const l = fns.length; let i = -1, a = fn(...args); while (++i < l) (a = fns[i](a)); return a; }
// // @ts-ignore: tslint dislikes these

// export const pick = keys => o => { let i = -1; const l = keys.length, acc = Object.create(null); while (++i < l) (acc[keys[i]] = o[keys[i]]); return acc; }


// export const invert = obj => transx((acc, v1, k1) => mapx((v2, k2) => {
//   (acc[k2] || (acc[k2] = {}))[k1] = v2;
// })(v1))(obj);
// const getMemoizedLenses = (keys,rw,kind)=>transArrayToObj((o,k)=>lenses[k]&&lenses[k][kind]&&(o[k]=lenses[k][kind][rw]))(keys.split(','))
const getLenses = (subkeys, lenses) => pick(subKeys.split(','))(lenses);
const getMemoizedLenses = (() => {
  // called frequently. Cache lens appliers with Trie for faster dual key lookups than string join.
  const cache = { read: {}, write: {} };
  return (rw, subKeys, lenses) => cache[rw][subKeys] || (cache[rw][subKeys] = applyLenses(subKeys, lenses));
})();

// utility functions that return the same type. For performance, user fn is only call in loop.
// equivalent to lodash reduce(coll,isArray(coll)[]?{},fn)
export const reducex = fn => coll => {
  let k = -1, acc = Object.create(null);
  if (isArray(coll)) {
    const l = coll.length;
    acc = [];
    while (++k < l) (acc = fn(acc, coll[k], k, coll));
  } else for (k in coll) (acc = fn(acc, coll[k], k, coll));
  return acc;
}
// equivalent to lodash transform(coll,isArray(coll)[]?{},fn)



const transx = (fn,getInitial=c=>({})) => coll => {
  const acc = getInitial(coll);
  let k = -1;
  if (isArray(coll)) {
    const l = coll.length;
    acc = [];
    while (++k < l) fn(acc, coll[k], acc.length, coll);
  } else for (k in coll) fn(acc, coll[k], k, coll);
  return acc;
}
export const filterx = fn => transx((nextx, v, k) => fn(v) === true && (nextx[k] = v));
export const omitx = fn => transx((nextx, v, k) => fn(v) === false && (nextx[k] = v));
export const mapx = fn => transx((nextx, v, k) => nextx[k] = fn(v, k));
export const overx = x => target => mapx(fn => fn(target))(x);
export const blankx = x => isArray(x) ? [] : Object.create(null);

export const mapValuePromiseOrStream = (
  mapStream = (handleValue = identity) => arg => toPromise(arg).then(handleValue, handleValue),
  mapPromise = (handleValue = identity) => arg => arg.then(handleValue, handleValue),
  mapValue = identity
) => (arg) => {
  if (typeof arg === 'function') return mapStream(mapValue)(arg);
  if (typeof arg === 'object' && arg.then) return mapPromise(mapValue)(arg);
  return mapValue(arg);
}
export const flowPossiblePromises = (...fns) => arg => fns.reduce(maybePromise, arg);

export const mapToPossiblePromise = (array, fn) => {
  let x, result, hasPromises;
  const vals = [];
  for (x of array) {
    result = maybePromise(x, fn);
    if (result.then) vals.hasPromises = true;
    vals[vals.length] = result;
  }
  return hasPromises ? Promise.all(vals) : vals;
}






// common op. imperative implementation for speed.
export const transB = fn => ([a, b]) => {
  if (isArray(b)) {
    let i = -1, l = b.length, retb = []; // eslint-disable-line prefer-const
    while (++i < l) fn(retb, a, b[i], i);
    return retb;
  } else {
    let k, retb = Object.create(null);
    for (k in x) (retb = fn(retb, a, b[k], k));
    return retb;
  }
};

// common op. imperative implementation for speed.
export const transDiff = (fn = identity, { by = x => x.id, subset = 'aub', ret } = {}) => (collections = []) => {
  const diff = diffBy(by, collections);
  if (ret === undefined) (ret = isArray(collections[0]) ? [] : Object.create(null));
  const { anb, bna, aib, aub, changed, a, b, [subset]: sub } = diff;
  const reused = Object.create(diff);
  let k;
  for (k in sub) {
    reused.anb = anb[k];
    reused.bna = bna[k];
    reused.aib = aib[k];
    reused.aub = aub[k];
    reused.changed = changed[k];
    reused.a = a[k];
    reused.b = b[k];
    reused.k = k;
    fn(ret, a[k], b[k], reused);
  }
  return ret;
}




const utilityFactory = ({ setop = 'aub', inputTarget = 'child', changeTarget = 'root' }) => { }
mapx(child => filterx())
// omitChildrenByChildrenIndex
// addChildrenByChildrenIndex 'anb'
// transform
// const setOp = (trans = 'omit', subset = 'aub', target = 'self|children', by = () => { })
// const setOpFactory = (trans = 'omit', subset = 'aub', target = 'props') => {
//   // omitA,omitB,omitAuB,omitAuB
// }
// root>children
// root>grandchildren



export const diffObjs = ([a, b] = [{}, {}]) => {
  // returns subsets and changed values for object properties
  // a !in b, b !in a, a union b, a intersection b (a[x] and b[x] exist), and changed intersections (i.e. a[x]!==b[x])
  // works with objects, and object-based collections already keyed by their ids
  const anb = {}, bna = {}, aib = {}, aub = {}, changed = {};
  let k, anbc = 0, bnac = 0, aibc = 0, changedc = 0;
  for (k in a) k in b ?
    (aibc += (aub[k] = aib[k] = (a[k] === b[k] ? 1 : (changedc += changed[k] = 1))))
    : (anbc += (aub[k] = anb[k] = 1));
  for (k in b) k in a
    ? ((k in aib)
      ? (aub[k] = aib[k] = 1)
      : (aibc += (aub[k] = aib[k] = (a[k] === b[k] ? 1 : (changedc += changed[k] = 1)))))
    : (++changedc,(bnac += aub[k] = bna[k] = changed[k] = 1));
  return { anb, anbc, bna, bnac, aib, aibc, aub, aubc: anbc + bnac + aibc, changed, changedc, a, b };
};

// TODO decide behavior when collections are arrays and no "by" key to diff them by
export const diffBy = (keyByArg='id')=>{
  keyByArg=keyBy(keyByArg)
  return (args = []) =>diffObjs(args.map(a=>Array.isArray?keyByArg(a):a));
}


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
