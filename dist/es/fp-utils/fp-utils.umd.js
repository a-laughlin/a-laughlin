(function(g,f){typeof exports==='object'&&typeof module!=='undefined'?f(exports):typeof define==='function'&&define.amd?define(['exports'],f):(g=typeof globalThis!=='undefined'?globalThis:g||self,f(g.FpUtils={}));}(this,(function(exports){'use strict';// curry/compose/pipe, for later fns

const identity=x=>x;
if(globalThis.process===undefined){
  globalThis.process={env:{NODE_ENV:'production'}};
}
if (globalThis.process.env.NODE_ENV !== 'production') {
  // debugging versions
  const fToString = fn => fn.name ? fn.name : fn.toString();
  exports.curry =(fn) => {
    const f1 = (...args) => {
      if (args.length >= fn.length) { return fn(...args) }      const f2 = (...more) => f1(...args, ...more);
      f2.toString = () => `${fToString(fn)}(${args.join(', ')})`;
      return Object.defineProperty(f2, `name`, { value: `${fToString(fn)}(${args.join(', ')})` });
    };
    f1.toString = () => fToString(fn);
    return Object.defineProperty(f1, `name`, { value: fToString(fn) });
  };

  // based on https://dev.to/ascorbic/creating-a-typed-compose-function-in-typescript-3-351i

  exports.compose = (...fns) => {
    if (fns.length===0)return identity;
    if (fns.length===1)return fns[0];
    const fn=fns[fns.length-1];
    fns=fns.slice(0,fns.length-1);
    const composed = (...args) => fns.reduceRight((acc, f) => f(acc), fn(...args));
    composed.toString = () => `compose(${fns.map(fToString).join(', ')})`;
    return composed;
  };
  exports.pipe = (fn=identity,...fns) => {
    if (fns.length===0)return fn;
    const piped = (...args) => fns.reduce((acc, f) => f(acc), fn(...args));
    piped.toString = () => `pipe(${fns.reverse().map(fToString).join(', ')})`;
    return piped;
  };
} else {
  // eslint-disable-next-line
  exports.curry = fn => (...args) => args.length >= fn.length ? fn(...args) : exports.curry(fn.bind(null, ...args));
  // eslint-disable-next-line
  exports.compose = (...fns) => (...args) =>{
    if (fns.length===0)return identity;
    if (fns.length===1)return fns[0];
    return fns.slice(0,fns.length-1).reduceRight((acc, f) => f(acc), fns[fns.length-1](...args));
  };
  // eslint-disable-next-line
  exports.pipe = (fn=identity,...fns) => (...args) => {
    if (fns.length===0)return fn;
    return fns.reduce((acc, f) => f(acc), fn(...args));
  };
}


// stubs

const stubNull = ()=>null;
const stubArray = ()=>[];
const stubObject = ()=>({});
const stubString = ()=>'';
const stubTrue = ()=>true;
const stubFalse = ()=>false;
const noop = ()=>{};
const range=(end=10,start=0,step=1,mapper=identity)=>{
  const result=[];
  while(start<end)result[result.length]=mapper(start+=step);
  return result;
};

// const stubs
const frozenEmptyArray = Object.freeze([]);
const frozenEmptyObject = Object.freeze(Object.create(null));


// primitive predicates
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
const isFinite = Number.isFinite || (v=>typeof value === 'number' && isFinite(value));
const isInteger = Number.isInteger || (v => isFinite(v) && v % 1 === 0);
const isError = e=>isObjectLike(e) && typeof e.message === 'string';
const isString = arg=>typeof arg==='string';
const isFunction = arg=>typeof arg==='function';
const isObjectLike = arg=>typeof arg==='object' && arg !== null;
const isArray = Array.isArray.bind(Array);
const is = val1=>val2=>val1===val2;
const isUndefOrNull = val => val === undefined || val === null;
const isProductionEnv = ()=>process.env.NODE_ENV === 'production';
const isPromise = x=>typeof x==='object'&&x!==null&&typeof x.then==='function';
const toPredicate = x=>{
  if(isFunction(x)) return x;
  if(isArray(x)) return matchesProperty(x);
  if(isObjectLike(x)) return matches(x);
  if(isString(x)) return hasKey(x)
  return stubFalse;
};

// debugging
const plog = (msg='')=>pipeVal=>console.log(msg,pipeVal) || pipeVal;

// flow
const dpipe = (data,...args)=>exports.pipe(...args)(data);
// functions
const makeCollectionFn=(arrayFn,objFn)=>(...args)=>ifElse(isArray,arrayFn(...args),objFn(...args));

const acceptArrayOrArgs = fn=>(...args)=>args.length>1 ? fn(args) : fn(ensureArray(args[0]));
const invokeArgsOnObj = (...args) => mapValues(fn=>fn(...args));
const invokeObjectWithArgs = (obj)=>(...args) => mapValues(fn=>isFunction(fn) ? fn(...args) : fn)(obj);

const overObj = (fnsObj={})=>(...args)=>{
  // console.log(`fnsObj`,fnsObj)
  return mo(f=>{
    if(typeof f!=='function')console.log('typeof f',f);
    return f(...args);
  })(fnsObj);
};
const overArray = (fnsArray=[])=>(...args)=>ma(f=>f(...args))(fnsArray);
const over = x=>isArray(x)?overArray(x):overObj(x);
const converge = over;//backwards compat;

// casting
const constant = x=>_=>x;
const ensureArray = (val=[])=>isArray(val) ? val : [val];
const ensureString = (val)=>isString(val) ? val : `${val}`;
const ensureFunction = (arg)=>typeof arg==='function'?arg:constant(arg);
const ensureProp = (obj,key,val)=>{obj.hasOwnProperty(key) ? obj[key] : (obj[key]=val);return obj;};
const ensurePropWith = fn=>(obj,key,val)=>ensureProp(obj,key,fn(obj,key,val));
const ensurePropIsArray = ensurePropWith(stubArray);
const ensurePropIsObject = ensurePropWith(stubObject);

// logic
// export const matches=o=>mo(_is)(o)(v,k)=>ma(v)k=>o=>k in o;
// const matches=o=>and(ma((v,k)=>is)(o),(o)
const not = fn=>(...args)=>!fn(...args);
const ifElseUnary = (pred,T,F=identity)=>arg=>pred(arg)?T(arg):F(arg);
const ifElse = (pred,T,F=identity)=>(...args)=>(pred(...args) ? T : F)(...args);
const and = acceptArrayOrArgs((preds)=>(...args)=>{
  // console.log(`preds`,preds)
  for (const p of preds)if(p(...args)!==true)return false;
  return true;
});
const or = acceptArrayOrArgs((preds)=>(...args)=>{
  for (const p of preds)if(p(...args)===true)return true;
  return false;
});
const xor = acceptArrayOrArgs((preds)=>(...args)=>{
  let p,trues=0;
  for (p of preds)
    (p(...args)===true && (++trues));
  return trues===1;
});
const _is = (x) => (y) => x===y;
const hasKey=(k='')=>(coll={})=>k in coll;
const matchesProperty=([k,v]=[])=>(o={})=>o[k]===v;
const matches=(coll={})=>and(...mapToArray((v,k)=>matchesProperty([k,v]))(coll));
const none = exports.compose(not,or);
const condNoExec = acceptArrayOrArgs(arrs=>(...x)=>{for (const [pred,val] of arrs) if(pred(...x)) return val;});
const cond = acceptArrayOrArgs(arrs=>(...x)=>{for (const [pred, fn] of arrs) if (pred(...x)) return fn(...x);});



// Array methods

// collections

const transArrayToObject = fn => (coll=[]) => {
  const l = coll.length, acc = Object.create(null);
  let k = -1;
  while (++k < l) fn(acc, coll[k], k, coll);
  return acc;
};
const transArrayToArray = fn => (coll=[]) => {
  const l = coll.length, acc = [];
  let k = -1;
  while (++k < l) fn(acc, coll[k], k, coll);
  return acc;
};
const transObjectToObject = fn => (coll={}) => {
  let k, acc = Object.create(null);
  for (k in coll) fn(acc, coll[k], k, coll);
  return acc;
};
const transObjectToArray = fn => (coll={}) => {
  let k, acc = [];
  for (k in coll) fn(acc, coll[k], k, coll);
  return acc;
};
const immutableTransObjectToObject = fn => (coll={}) => {
  let k, acc = {},changed=false;
  for (k in coll) {
    fn(acc, coll[k], k, coll);
    if (acc[k]!==coll[k]) changed=true;
  }
  return changed===false?coll:acc;
};
const immutableTransArrayToArray = fn => (coll=[]) => {
  let k, acc = [],changed=false;
  for (k of coll) {
    fn(acc, coll[k], k, coll);
    if (acc[k]!==coll[k]) changed=true;
  }
  return changed===false?coll:acc;
};
const immutableFilterObjectToObject = (pred=(v,k,c)=>true) => (coll={}) => {
  let k, acc = {},changed=false;
  for (k in coll)
    pred(coll[k], k, coll)
      ? (acc[k]=coll[k])
      : (changed=true);
  return changed===true?acc:coll;
};

const transToObject = makeCollectionFn(transArrayToObject,transObjectToObject);
const ro=transToObject; // backward compatability 
const transToArray = makeCollectionFn(transArrayToArray,transObjectToArray);
const ra=transToArray; // backward compatability
const transToSame = makeCollectionFn(transArrayToArray,transObjectToObject);
const rx = transToSame; // backward compatability
const filterToArray =pred=>transToArray((a,v,k)=>pred(v,k)&&(a[a.length]=v)); // _ equiv filter
const fa=filterToArray; // backward compatability
const filterToObject=pred=>transToObject((a,v,k)=>pred(v,k)&&(a[k]=v)); // _ equiv pickBy
const fo=filterToObject; // backward compatability
const filterToSame=makeCollectionFn(filterToArray,filterToObject);
const fx=filterToSame;// backward compatability
const omitToArray=pred=>transToArray((a,v,k)=>!pred(v,k)&&(a[a.length]=v)); // _ equiv withoutBy
const oa=omitToArray; // backward compatability
const omitToObject=pred=>transToObject((a,v,k)=>!pred(v,k)&&(a[k]=v)); // _ equiv pickBy
const oo=omitToObject; // backward compatability
const omitToSame=makeCollectionFn(omitToArray,omitToObject);
const ox=omitToSame; // backward compatability
const mapToArray=fn=>transToArray((a,v,k)=>a[a.length]=fn(v,k)); // _ equiv map
const ma=mapToArray; // backward compatability
const mapToObject=fn=>transToObject((a,v,k)=>a[k]=fn(v,k)); // _ equiv mapValues
const mo=mapToObject; // backward compatability
const mapToSame=makeCollectionFn(mapToArray,mapToObject);
const mx=mapToSame; // backward compatability
const filterMapToArray = (pred,mapper)=>transToArray((a,v,k)=>pred(v,k)&&(a[a.length]=mapper(v,k)));
const fma = filterMapToArray; // backward compatability
const filterMapToObject = (pred,mapper)=>transToObject((o,v,k)=>pred(v,k)&&(o[k]=mapper(v,k)));
const fmo = filterMapToObject; // backward compatability
const filterMapToSame=makeCollectionFn(filterMapToArray,filterMapToObject);
const fmx=filterMapToSame; // backward compatability

const first = c=>{
  if (isArray(c)) return c[0];
  for (const k in c)return c[k];
};
const last = c =>{
  c=isArray(c)?c:Object.values(c);
  return c[c.length-1];
};
const partitionObject = (...preds)=>overArray([...(preds.map(p=>fo(p))),fo(none(...preds))]);
const partitionArray = (...preds)=>overArray([...(preds.map(fa)),fa(none(...preds))]);
const partition = makeCollectionFn(partitionArray,partitionObject);


// collection predicates
const len = makeCollectionFn(
  num=>({length})=>length===num,
  num=>coll=>{
    let l=0,k;
    for (k in coll)if(++l>num)return false;
    return l===num;
  }
);
const len0 = len(0);
const len1 = len(1);
const has = key=>obj=>key in obj;
const isDeepEqual=(a,b)=>{ // decently fast check on objects and arrays
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
};

// indexers
const keyBy = ifElseUnary(isString,
  (id='id')=>transToObject((o,v,k)=>{o[v[id]]=v;}),
  (fn=x=>x.id)=>transToObject((o,v,k)=>{o[fn(v,k)]=v;})
);
const pushToArray=(a=[],v)=>{a[a.length]=v;return a;};
const pushToArrayProp=(acc={},v,k)=>{acc[k]=pushToArray(acc[k],v);return acc;};
const groupBy = fn=>transToObject((o,v,k,c)=>pushToArrayProp(o,v,fn(v,k)));
const groupByKeys = transToObject((o,v,k)=>{for (k in v)pushToArrayProp(o,v,k);});
const groupByValues = transToObject((o,v)=>{
  let k,vv;
  for (k in v)
    for (vv of ensureArray(v[k]))
      pushToArrayProp(o,v,ensureString(vv));
});


// getters
const pget = cond( // polymorphic get
  [isString,str=>{
    str=str.split('.');
    return targ=>str.reduce((t,s)=>isArray(t) && !isInteger(+s) ? t.map(o=>o[s]) : t[s], targ)
  }],
  [isArray,keys=>pick(keys)],
  [isObjectLike, obj=>target=>mo(f=>pget(f)(target))(obj)],
  [stubTrue,identity], // handles the function case
);
const pick=cond(
  [isArray,keys=>obj=>transArrayToObject((o,k)=>o[k]=obj[k])(keys)],
  [isString,key=>obj=>obj[key]],
  [isFunction,filterToSame],
);




// Objects

const objStringifierFactory = ({
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
const objToUrlParams = objStringifierFactory({
  getPrefix:(input,output)=>output ? '?' : '',
  mapPairs:encodeURIComponent,
});

// content
const uniqueId = (()=>{
  let id=0;
  return (predix='')=>`${predix}${++id}`;
})();







const transduce = (acc, itemCombiner , transducer, collection) =>
  tdReduceListValue(transducer(itemCombiner))(acc,collection);

const appendArrayReducer = (acc=[],v)=>{acc[acc.length]=v;return acc;};
const appendObjectReducer = (acc={},v,k)=>{acc[k]=v;return acc;};
const tdToArray = transducer=>collection=>transduce([], appendArrayReducer, transducer, collection);
const tdToObject = transducer=>collection=>transduce(({}), appendObjectReducer, transducer, collection);
const tdToObjectImmutable = transducer=>{
  let lastOutput={};
  let lastCount;
  return collection=>{
    // console.log(`transducer`,transducer)
    let count=0,changed=false;
    const output=tdToObject(exports.compose(
      transducer,
      tdTap((a,v,k,c)=>{++count;if(v!==lastOutput[k]){changed=true;}})
    ))(collection);
    if(changed===true||lastCount!==count){
      lastCount=count;
      lastOutput=output;
    }
    return lastOutput;
  };
};
const tdToSame = transducer=>collection=>(Array.isArray(collection)?tdToArray:tdToObject)(transducer)(collection);

const tdMap = mapper => nextReducer => (a,v,...kc) => nextReducer(a,mapper(v,...kc),...kc);
const tdMapKey = mapper => nextReducer => (a,v,k,...c) => nextReducer(a,v,mapper(v,k,...c),...c);
const tdMapWithAcc = mapper => nextReducer => (a,v,...kc) => nextReducer(a,mapper(a,v,...kc),...kc);
const tdMapKeyWithAcc = mapper => nextReducer => (a,v,k,...c) => nextReducer(a,v,mapper(a,v,k,...c),...c);
const tdAssign = f=>nextReducer => (a,v,...kc) =>nextReducer({...a,...f(a,v,...kc)},v,...kc);
const tdSet = (key,f)=>nextReducer => (a,v,...kc) =>{
  const next = f(a,v,...kc);
  return a[key]===next?nextReducer(a,v,k,c):nextReducer({...a,[key]:next},v,...kc);
};
const tdReduce = reducer => nextReducer => (a,...vkc) =>
  nextReducer(reducer(a,...vkc),...vkc);
const tdIdentity = identity;
const tdTap = fn => nextReducer => (...args) => {
  fn(...args);
  return nextReducer(...args);
};

const tdLog = (msg='log',pred=stubTrue)=>tdTap((...args)=>pred(...args)&&console.log(msg,...args));
const tdFilter = (pred=stubTrue) => nextReducer => (a,...args) => pred(...args) ? nextReducer(a,...args) : a;
const tdFilterWithAcc = (pred=stubTrue) => nextReducer => (...args) => pred(...args) ? nextReducer(...args) : args[0];
const tdOmit = pred=>tdFilter(not(pred));
const tdOmitWithAcc = pred=>tdFilterWithAcc(not(pred));
const tdPipeToArray = (...fns)=>tdToArray(exports.compose(...fns));
const tdPipeToObject = (...fns)=>tdToObject(exports.compose(...fns));
const tdDPipeToArray = (coll,...fns)=>tdToArray(exports.compose(...fns))(coll);
const tdDPipeToObject = (coll,...fns)=>tdToObject(exports.compose(...fns))(coll);
const tdReduceListValue = nextReducer=>(acc,v,k,...args)=>{
  if (!isObjectLike(v))
    return nextReducer(acc, v,k,...args);
  if (isArray(v))
    for(let kk=-1,l=v.length;++kk<l;) acc=nextReducer(acc, v[kk], kk, v);
  else
    for (const kk in v) acc=nextReducer(acc, v[kk], kk, v);
  return acc;
};
const reduce = (fn) => (coll,acc) => tdReduceListValue(fn)(acc,coll);
const tdIfElse=(pred,tdT,tdF=identity)=>nextReducer=>ifElse(pred,tdT(nextReducer),tdF(nextReducer));
const isReducerValueObjectLike=(a,v)=>isObjectLike(v);
const tdIfValueObjectLike=transducer=>tdIfElse(isReducerValueObjectLike,transducer);
const tdDfObjectLikeValuesWith=(getChildAcc=stubObject)=>tdIfValueObjectLike(
  nextReducer=>(a,v,k,c,childReducer)=>nextReducer(a,childReducer(getChildAcc(a,v,k,c),v),k,c),
);
const transduceDF = ({
  preVisit=tdIdentity,
  visit=tdDfObjectLikeValuesWith(stubObject),
  postVisit=tdIdentity,
  edgeCombiner=(acc={},v,k)=>{acc[k]=v;return acc;},
  childrenLoopReducer=tdReduceListValue
}={})=>{
  const tempdfReducer = exports.compose(
    preVisit,
    nextReducer=>(a,v,k,c)=>nextReducer(a,v,k,c,dfReducer),
    visit,
    postVisit,
  )(edgeCombiner);
  const dfReducer = childrenLoopReducer(tempdfReducer);
  return dfReducer;
  // return (a,v,k,c)=>isObjectLike(v) ? dfReducer(a,v,k,c) : tempdfReducer(a,v,k,c);
};


const transduceBF = ({
  preVisit=tdIdentity,
  visit=tdIdentity,//tdBfObjectLikeValuesWith(stubObject),
  postVisit=tdIdentity,
  edgeCombiner=(acc={},v,k)=>{acc[k]=v;return acc;},
  childrenLoopReducer=tdReduceListValue,
}={})=>{
  let queue=[];
  const pushNextQueueItems = childrenLoopReducer((aa,vv,kk,cc)=>{// push next level
    pushToArray(queue,[aa,vv,kk,cc]);
    return aa;
  });
  const reduceItem = exports.compose(
    preVisit,
    nextReducer=>(a,v,k,c)=>{
      if (isObjectLike(v)){
        const childAcc={};
        nextReducer(a,childAcc,k,c); // combine levels
        pushNextQueueItems(childAcc,v,k,c);
      } else {
        nextReducer(a,v,k,c);
      }
      if(queue.length>0)
        reduceItem(...queue.shift());
    },
    postVisit
  )(edgeCombiner);
  return childrenLoopReducer((a,v,k,c)=>{
    reduceItem(a,v,k,c);
    return a;
  });
};

// lodash equivalents
const memoize = (fn, by = identity) => {
  const mFn = (...x) => { const k = by(...x); return fn(...(mFn.cache.has(k) ? mFn.cache.get(k) : (mFn.cache.set(k, x) && x))) };
  mFn.cache = new WeakMap(); // eslint-disable-line
  return mFn;
};


const tdKeyBy = (by = x => x.id) => next=>(o,v,k,c)=>next(o,v,by(v,k,c),c);

const diffObjs = (a={},b={}) => {
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
const diffBy = (by=x=>x.id, args = []) => by ? diffObjs(...args.map(keyBy(by))) : diffObjs(args);


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
exports._is=_is;exports.acceptArrayOrArgs=acceptArrayOrArgs;exports.and=and;exports.appendArrayReducer=appendArrayReducer;exports.appendObjectReducer=appendObjectReducer;exports.cond=cond;exports.condNoExec=condNoExec;exports.constant=constant;exports.converge=converge;exports.diffBy=diffBy;exports.diffObjs=diffObjs;exports.dpipe=dpipe;exports.ensureArray=ensureArray;exports.ensureFunction=ensureFunction;exports.ensureProp=ensureProp;exports.ensurePropIsArray=ensurePropIsArray;exports.ensurePropIsObject=ensurePropIsObject;exports.ensurePropWith=ensurePropWith;exports.ensureString=ensureString;exports.fa=fa;exports.filterMapToArray=filterMapToArray;exports.filterMapToObject=filterMapToObject;exports.filterMapToSame=filterMapToSame;exports.filterToArray=filterToArray;exports.filterToObject=filterToObject;exports.filterToSame=filterToSame;exports.first=first;exports.fma=fma;exports.fmo=fmo;exports.fmx=fmx;exports.fo=fo;exports.frozenEmptyArray=frozenEmptyArray;exports.frozenEmptyObject=frozenEmptyObject;exports.fx=fx;exports.groupBy=groupBy;exports.groupByKeys=groupByKeys;exports.groupByValues=groupByValues;exports.has=has;exports.hasKey=hasKey;exports.identity=identity;exports.ifElse=ifElse;exports.ifElseUnary=ifElseUnary;exports.immutableFilterObjectToObject=immutableFilterObjectToObject;exports.immutableTransArrayToArray=immutableTransArrayToArray;exports.immutableTransObjectToObject=immutableTransObjectToObject;exports.invokeArgsOnObj=invokeArgsOnObj;exports.invokeObjectWithArgs=invokeObjectWithArgs;exports.is=is;exports.isArray=isArray;exports.isDeepEqual=isDeepEqual;exports.isError=isError;exports.isFinite=isFinite;exports.isFunction=isFunction;exports.isInteger=isInteger;exports.isObjectLike=isObjectLike;exports.isProductionEnv=isProductionEnv;exports.isPromise=isPromise;exports.isString=isString;exports.isUndefOrNull=isUndefOrNull;exports.keyBy=keyBy;exports.last=last;exports.len=len;exports.len0=len0;exports.len1=len1;exports.ma=ma;exports.mapToArray=mapToArray;exports.mapToObject=mapToObject;exports.mapToSame=mapToSame;exports.matches=matches;exports.matchesProperty=matchesProperty;exports.memoize=memoize;exports.mo=mo;exports.mx=mx;exports.none=none;exports.noop=noop;exports.not=not;exports.oa=oa;exports.objStringifierFactory=objStringifierFactory;exports.objToUrlParams=objToUrlParams;exports.omitToArray=omitToArray;exports.omitToObject=omitToObject;exports.omitToSame=omitToSame;exports.oo=oo;exports.or=or;exports.over=over;exports.overArray=overArray;exports.overObj=overObj;exports.ox=ox;exports.partition=partition;exports.pget=pget;exports.pick=pick;exports.plog=plog;exports.ra=ra;exports.range=range;exports.reduce=reduce;exports.ro=ro;exports.rx=rx;exports.stubArray=stubArray;exports.stubFalse=stubFalse;exports.stubNull=stubNull;exports.stubObject=stubObject;exports.stubString=stubString;exports.stubTrue=stubTrue;exports.tdAssign=tdAssign;exports.tdDPipeToArray=tdDPipeToArray;exports.tdDPipeToObject=tdDPipeToObject;exports.tdDfObjectLikeValuesWith=tdDfObjectLikeValuesWith;exports.tdFilter=tdFilter;exports.tdFilterWithAcc=tdFilterWithAcc;exports.tdIdentity=tdIdentity;exports.tdIfElse=tdIfElse;exports.tdIfValueObjectLike=tdIfValueObjectLike;exports.tdKeyBy=tdKeyBy;exports.tdLog=tdLog;exports.tdMap=tdMap;exports.tdMapKey=tdMapKey;exports.tdMapKeyWithAcc=tdMapKeyWithAcc;exports.tdMapWithAcc=tdMapWithAcc;exports.tdOmit=tdOmit;exports.tdOmitWithAcc=tdOmitWithAcc;exports.tdPipeToArray=tdPipeToArray;exports.tdPipeToObject=tdPipeToObject;exports.tdReduce=tdReduce;exports.tdReduceListValue=tdReduceListValue;exports.tdSet=tdSet;exports.tdTap=tdTap;exports.tdToArray=tdToArray;exports.tdToObject=tdToObject;exports.tdToObjectImmutable=tdToObjectImmutable;exports.tdToSame=tdToSame;exports.toPredicate=toPredicate;exports.transArrayToArray=transArrayToArray;exports.transArrayToObject=transArrayToObject;exports.transObjectToArray=transObjectToArray;exports.transObjectToObject=transObjectToObject;exports.transToArray=transToArray;exports.transToObject=transToObject;exports.transToSame=transToSame;exports.transduce=transduce;exports.transduceBF=transduceBF;exports.transduceDF=transduceDF;exports.uniqueId=uniqueId;exports.xor=xor;Object.defineProperty(exports,'__esModule',{value:true});})));