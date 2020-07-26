
import _merge from 'lodash-es/merge';
import {default as _set} from 'lodash-es/set';
import _overEvery from 'lodash-es/overEvery';
import overSome from 'lodash-es/overSome';
import sortBy from 'lodash-es/sortBy';
import isString from 'lodash-es/isString';
import pick from 'lodash-es/pick';
import isPlainObject from 'lodash-es/isPlainObject';
import _matches from 'lodash-es/matches';

// curry/compose/pipe, for later fns
let curry,compose,pipe;
export const identity=x=>x;
if (process.env.NODE_ENV !== 'production') {
  // debugging versions
  const fToString = fn => fn.name ? fn.name : fn.toString();
  curry =(fn) => {
    const f1 = (...args) => {
      if (args.length >= fn.length) { return fn(...args) };
      const f2 = (...more) => f1(...args, ...more);
      f2.toString = () => `${fToString(fn)}(${args.join(', ')})`;
      return Object.defineProperty(f2, `name`, { value: `${fToString(fn)}(${args.join(', ')})` });
    };
    f1.toString = () => fToString(fn);
    return Object.defineProperty(f1, `name`, { value: fToString(fn) });
  };

  // based on https://dev.to/ascorbic/creating-a-typed-compose-function-in-typescript-3-351i

  compose = (fn=identity,...fns) => {
    const composed = (...args) => fns.reduceRight((acc, f) => f(acc), fn(...args));
    composed.toString = () => `compose(${fns.map(fToString).join(', ')})`;
    return composed;
  };
  pipe = (fn=identity,...fns) => {
    const piped = (...args) => fns.reduce((acc, f) => f(acc), fn(...args));
    piped.toString = () => `pipe(${fns.reverse().map(fToString).join(', ')})`;
    return piped;
  };
} else {
  // eslint-disable-next-line
  curry = fn => (...args) => args.length >= fn.length ? fn(...args) : curry(fn.bind(null, ...args));
  // eslint-disable-next-line
  compose = (fn=identity,...fns) => (...args) => fns.reduceRight((acc, f) => f(acc), fn(...args));
  // eslint-disable-next-line
  pipe = (fn=identity,...fns) => (...args) => fns.reduce((acc, f) => f(acc), fn(...args));
}
export { curry, compose, pipe };


// stubs

export const stubNull = ()=>null;
export const stubArray = ()=>[];
export const stubObject = ()=>({});
export const stubString = ()=>'';
export const stubTrue = ()=>true;
export const stubFalse = ()=>false;
export const noop = ()=>{};

// const stubs
export const frozenEmptyArray = Object.freeze([]);
export const frozenEmptyObject = Object.freeze(Object.create(null));


// predicates
// export {isError,isInteger,isNumber,isObjectLike,hasIn,has,isWeakMap,isWeakSet,isMap,
//   isSet,isEmpty,isString,isPlainObject,isFunction,isNull,isUndefined,every,conforms} from 'lodash-es';
export const isArray = Array.isArray.bind(Array);
export const isFalsy = arg=>!arg;
export const isTruthy = arg=>!!arg;
export const is = val1=>val2=>val1===val2;
export const isUndefOrNull = val => val == undefined; // eslint-disable-line
export const len = num=>({length})=>length===num;
export const len0 = len(0);
export const len1 = len(1);
export const isProductionEnv = ()=>process.env.NODE_ENV === 'production';
export const matches = _matches;
export const isDeepEqual=(a,b)=>{ // decently fast check on objects and arrays
  if (a===b)return true;
  if (typeof a !== 'object')return a===b;
  if (Array.isArray(a)){
    if (Array.isArray(b)===false||a.length!==b.length)return false;
    let key=-1,L=toCheck.length;
    while (++key<L) if (isCached(a[key],b[key])===false) return false;
    return true;
  }
  let key;
  for (key in toCheck) if (isCached(a[key],b[key])===false) return false;
  return true;
}

// debugging
export const plog = (msg='')=>pipeVal=>console.log(msg,pipeVal) || pipeVal;

// flow
export const dpipe = (data,...args)=>pipe(...args)(data);

// functions
export const acceptArrayOrArgs = fn=>(...args)=>args.length>1 ? fn(args) : fn(...args);
export const invokeArgsOnObj = (...args) => mapValues(fn=>fn(...args));
export const invokeObjectWithArgs = (obj)=>(...args) => mapValues(fn=>isFunction(fn) ? fn(...args) : fn)(obj);
export const mergeToBlank = acceptArrayOrArgs(vals => _merge({},...vals));

export const overObj = obj=>(...args)=>mo(f=>f(...args))(obj);
export const converge = (arg)=>(isArray(arg)?over:overObj)(arg);

// casting
export const constant = x=>_=>x;
export const ensureArray = (val=[])=>isArray(val) ? val : [val];
export const ensureString = (val)=>isString(val) ? val : `${val}`;
export const ensureFunction = (arg)=>typeof arg==='function'?arg:constant(arg);
export const ensureProp = (obj,key,val)=>{obj.hasOwnProperty(key) ? obj[key] : (obj[key]=val);return obj;};
export const ensurePropWith = fn=>(obj,key,val)=>ensureProp(obj,key,fn(obj,key,val));
export const ensurePropIsArray = ensurePropWith(stubArray);
export const ensurePropIsObject = ensurePropWith(stubObject);

// logic
export const not = fn=>arg=>!fn(arg);
export const ifElseUnary = (pred,T,F=identity)=>arg=>pred(arg)?T(arg):F(arg);
export const ifElse = (pred,T,F=identity)=>(...args)=>(pred(...args) ? T : F)(...args);
export const and = (...args)=>_overEvery(args);
export const or = (...args)=>overSome(...args);
export const none = not(or);
export const xor = fn=>pipe(filter(fn),len1);
export const condNoExec = acceptArrayOrArgs(arrs=>(...x)=>{for (let [pred,val] of arrs){if(pred(...x)){return val;}}});
export const cond = acceptArrayOrArgs(arrs=>(...args)=>ensureFunction(condNoExec(...arrs)(...args))(...args));



// Array methods
export const slice = (...sliceArgs)=>arr=>arr.slice(...sliceArgs);
export const reverse = arr=>arr.slice(0).reverse(); // immutable array reverse
export const sort = coll=>sortBy(coll,null);




// collections
const makeCollectionFn=(arrayFn,objFn)=>fn=>{
  const aFn=arrayFn(fn);
  const oFn=objFn(fn);
  return coll=>isArray(coll)?aFn(coll):oFn(coll);
}
const transArrayToObject = fn => (coll=[]) => {
  const l = coll.length, acc = Object.create(null);
  let k = -1;
  while (++k < l) fn(acc, coll[k], k, coll);
  return acc;
}
const transArrayToArray = fn => (coll=[]) => {
  const l = coll.length, acc = [];
  let k = -1;
  while (++k < l) fn(acc, coll[k], k, coll);
  return acc;
}
const transObjectToObject = fn => (coll={}) => {
  let k, acc = Object.create(null);
  for (k in coll) fn(acc, coll[k], k, coll);
  return acc;
}
const transObjectToArray = fn => (coll={}) => {
  let k, acc = [];
  for (k in coll) fn(acc, coll[k], k, coll);
  return acc;
}
export const immutableTransObjectToObject = fn => (coll={}) => {
  let k, acc = {},changed=false;
  for (k in coll) {
    fn(acc, coll[k], k, coll);
    if (acc[k]!==coll[k]) changed=true;
  }
  return changed===false?coll:acc;
}
export const immutableFilterObjectToObject = (pred=(v,k,c)=>true) => (coll={}) => {
  let k, acc = {},changed=false;
  for (k in coll)
    pred(coll[k], k, coll)
      ? (acc[k]=coll[k])
      : (changed=true);
  return changed===true?acc:coll;
}
export const transX = makeCollectionFn(transArrayToArray,transObjectToObject);
export const transToObject = makeCollectionFn(transArrayToObject,transObjectToObject);
export const transToArray = makeCollectionFn(transArrayToArray,transObjectToArray);
// utility functions that return the same type. For performance, user fn is only call in loop.
// equivalent to lodash reduce(coll,isArray(coll)[]?{},fn)
export const reduce = fn => (coll,acc) => {
  let k = -1;
  if (isArray(coll)) {
    const l = coll.length;
    while (++k < l) (acc = fn(acc, coll[k], k, coll));
  } else for (k in coll) (acc = fn(acc, coll[k], k, coll));
  return acc;
}

// backwards compat
// shortcuts for the most common collection operations
// prefixes = r,m,f,o,fm = reduce,map,filter,omit,filter+map
// suffixes = o,a,x = toObject,toArray,toX (where X is the same type as input)
export const ro=transToObject; 
export const ra=transToArray; // backwards compat
export const ma=fn=>transToArray((a,v,k)=>a[a.length]=fn(v,k)); // _ equiv map
export const mo=fn=>transToObject((a,v,k)=>a[k]=fn(v,k)); // _ equiv mapValues
export const fa=pred=>transToArray((a,v,k)=>pred(v,k)&&(a[a.length]=v)); // _ equiv filter
export const fo=pred=>transToObject((a,v,k)=>pred(v,k)&&(a[k]=v)); // _ equiv pickBy
export const oa=pred=>transToArray((a,v,k)=>!pred(v,k)&&(a[a.length]=v)); // _ equiv withoutBy
export const oo=pred=>transToObject((a,v,k)=>!pred(v,k)&&(a[k]=v)); // _ equiv pickBy

// partionObject((v,k)=>k=='a',(v,k)=>k!='a')({a:1,b:2,c:3}) =>[{a:1},{b:1,c:2}]
// partionObject((v,k)=>v==1,(v,k)=>v!=1)({a:1,b:2,c:3}) =>[{a:1,b:1},{c:2}]
// partionObject((v,k)=>v==1)({a:1,b:2,c:3}) =>[{a:1,b:1},{c:2}]
const partitionObject = (...preds)=>over([...(preds.map(fo)),fo(none(preds))]);
const partitionArray = (...preds)=>over([...(preds.map(fa)),fa(none(preds))]);
export const partition = makeCollectionFn(partitionArray,partitionObject);




// indexers
export const keyBy = ifElseUnary(isString,
  (id='id')=>transToObject((o,v,k)=>{o[v[id]]=v;}),
  (fn=x=>x.id)=>transToObject((o,v,k)=>{o[fn(v,k)]=v;})
);
const pushToArray=(a=[],v)=>{a[a.length]=v;return a;};
const pushToArrayProp=(acc={},v,k)=>{acc[k]=pushToArray(acc[k],v);return acc;}
export const groupBy = fn=>transToObject((o,v,k,c)=>pushToArrayProp(o,v,fn(v,k)));
export const groupByKeys = transToObject((o,v,k)=>{for (k in v)pushToArrayProp(o,v,k)});
export const groupByValues = transToObject((o,v)=>{
  let k,vv;
  for (k in v)
    for (vv of ensureArray(v[k]))
      pushToArrayProp(o,v,ensureString(vv));
});


// getters
export const pget = cond(
  [isString,str=>{
    str=str.split('.');
    return targ=>str.reduce((t,s)=>isArray(t) && !isInteger(+s) ? t.map(o=>o[s]) : t[s], targ)
  }],
  [isArray,keys=>obj=>pick(obj,keys)],
  [isPlainObject, obj=>target=>mo(f=>pget(f)(target))(obj)],
  [stubTrue,identity], // handles the function case
);
export const first = c=>{
  if (isArray(c)) return c[i];
  for (const k in c)return c[k];
}
export const last = c =>{
  c=isArray(c)?c:Object.values(c);
  return c[c.length-1];
}



// Objects

export const renameProps = obj=>target=>{
  let newKey,oldKey,targetCopy = {...target};
  for (newKey in obj){
    oldKey=obj[newKey]
    targetCopy[newKey]=target[oldKey]
    delete targetCopy[oldKey];
  }
  return targetCopy;
}
export const objStringifierFactory = ({
  getPrefix=()=>'',
  getSuffix=()=>'',
  mapPairs=x=>x,
  keySplit = '=',
  pairSplit = '&'
} = {})=>(input={})=>{
  const output = Object.keys(input)
  .map(k=>([k, input[k]].map(mapPairs).join(keySplit)))
  .join(pairSplit);
  return getPrefix(input,output) + output + getSuffix(input, output);
};
export const objToUrlParams = objStringifierFactory({
  getPrefix:(input,output)=>output ? '?' : '',
  mapPairs:encodeURIComponent,
});

// content
export {default as uniqueId} from 'lodash-es/uniqueId'





export const isPromise = x=>typeof x==='object'&&x!==null&&typeof x.then==='function';

export const transduce = (acc, combiner , transducer, collection) =>{
  let k,l;
  const reducer = transducer(combiner);
  if (Array.isArray(collection))
    for (k=-1, l = collection.length;++k < l;)
      (acc=isPromise(acc)
        ? acc.then(a=>reducer(a, collection[k], k, collection))
        : reducer(acc, collection[k], k, collection));
  else if (typeof collection === 'object')
    for (k in collection)
      (acc=isPromise(acc)
        ? acc.then(a=>reducer(a, collection[k], k, collection))
        : reducer(acc, collection[k], k, collection));
  else 
    (acc=isPromise(acc)
      ? acc.then(a=>reducer(a, collection, null,null))
      : reducer(acc, collection,null));
  return acc;
}

export const appendArrayReducer = (acc,v)=>{acc[acc.length]=v;return acc;}
export const appendObjectReducer = (acc,v,k)=>{acc[k]=v;return acc;}
export const tdToArray = transducer=>collection=>transduce([], appendArrayReducer, transducer, collection);
export const tdToObject = transducer=>collection=>transduce(({}), appendObjectReducer, transducer, collection);
export const tdToSame = transducer=>collection=>(Array.isArray(collection)?tdToArray:tdToObject)(transducer)(collection);
export const tdToInitial = transducer=>initial=>transduce(initial, identity, transducer, [initial]);

export const tdMap = (mapper) => (nextReducer) => (a,v,k,c) => nextReducer(a,mapper(v,k,c),k,c);
export const tdFilter = (pred) => (nextReducer) => (a,v,k,c) => pred(v,k,c) ? nextReducer(a,v,k,c) : a;
export const tdOmit = (pred) => (nextReducer) => (a,v,k,c) => pred(v,k,c) ? a: nextReducer(a,v,k,c);
export const tdReduce = (reducer) => (nextReducer) => (a,v,k,c) =>nextReducer(reducer(a,v,k,c),v,k,c);
export const tdTrans = (reducer) => (nextReducer) => (a,v,k,c)=>{
  reducer(a,v,k,c);
  nextReducer(a,v,k,c);
  return a;
};
export const tdOver = (...reducers) => (nextReducer) => (a,v,k,c) => {
  return nextReducer(reducers.reduce((aa,r,i)=>aa[aa.length]=r(aa,v,i,c),k,c,[]),v,k,c);
};
export const tdFlat = tdReduce((a) => {
  return a.reduce((acc,subArr)=>{for (let s of subArr)acc[acc.length]=s;return acc;},[]);
});

export const transduceRecursive = transducer=>{
  const walkReducer = tdToSame(compose(
    transducer,
    tdMap(v=>typeof v==='object'?walkReducer(v):v)
  ));
  return walkReducer;
}
// lodash equivalents
export const memoize = (fn, by = identity) => {
  const mFn = (...x) => { const k = by(...x); return fn(...(mFn.cache.has(k) ? mFn.cache.get(k) : (mFn.cache.set(k, x) && x))) };
  mFn.cache = new WeakMap(); // eslint-disable-line
  return mFn;
};
export const tdKeyBy = (by = x => x.id) => next=>(o,v,k,c)=>next(o,v,by(v,k,c),c)

export const diffObjs = (a={},b={}) => {
  // returns subsets and changed values for object properties
  // a !in b, b !in a, a union b, a intersection b (a[x] and b[x] exist), and changed intersections (i.e. a[x]!==b[x])
  // works with objects, and object-based collections already keyed by their ids
  const anb = {}, bna = {}, aib = {}, aub = {}, changed = {};
  let k, anbc = 0, bnac = 0, aibc = 0, changedc = 0;
  for (k in a) k in b ?
    (aibc += aub[k] = aib[k] = (a[k] === b[k] ? 1 : (changedc += changed[k] = 1)))
    : (anbc += aub[k] = anb[k] = 1);
  for (k in b) k in a
    ? ((k in aib)
      ? (aub[k] = aib[k] = 1)
      : (aibc += aub[k] = aib[k] = (a[k] === b[k] ? 1 : (changedc += changed[k] = 1))))
    : (bnac += aub[k] = bna[k] = 1);
  return { anb, anbc, bna, bnac, aib, aibc, aub, aubc: anbc + bnac + aibc, changed, changedc, a, b };
};

// TODO decide behavior when collections are arrays and no "by" key to diff them by
export const diffBy = (by=x=>x.id, args = []) => by ? diffObjs(...args.map(keyBy(by))) : diffObjs(args);

