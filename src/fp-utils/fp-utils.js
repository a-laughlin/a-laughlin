// curry/compose/pipe, for later fns
let curry,compose,pipe;
export const identity=x=>x;
if(globalThis.process===undefined){
  globalThis.process={env:{NODE_ENV:'production'}}
}
if (globalThis.process.env.NODE_ENV !== 'production') {
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

  compose = (...fns) => {
    if (fns.length===0)return identity;
    if (fns.length===1)return fns[0];
    const fn=fns[fns.length-1];
    fns=fns.slice(0,fns.length-1);
    const composed = (...args) => fns.reduceRight((acc, f) => f(acc), fn(...args));
    composed.toString = () => `compose(${fns.map(fToString).join(', ')})`;
    return composed;
  };
  pipe = (fn=identity,...fns) => {
    if (fns.length===0)return fn;
    const piped = (...args) => fns.reduce((acc, f) => f(acc), fn(...args));
    piped.toString = () => `pipe(${fns.reverse().map(fToString).join(', ')})`;
    return piped;
  };
} else {
  // eslint-disable-next-line
  curry = fn => (...args) => args.length >= fn.length ? fn(...args) : curry(fn.bind(null, ...args));
  // eslint-disable-next-line
  compose = (...fns) => (...args) =>{
    if (fns.length===0)return identity;
    if (fns.length===1)return fns[0];
    return fns.slice(0,fns.length-1).reduceRight((acc, f) => f(acc), fns[fns.length-1](...args));
  }
  // eslint-disable-next-line
  pipe = (fn=identity,...fns) => (...args) => {
    if (fns.length===0)return fn;
    return fns.reduce((acc, f) => f(acc), fn(...args));
  }
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
export const range=(end=10,start=0,step=1,mapper=identity)=>{
  const result=[];
  while(start<end)result[result.length]=mapper(start+=step);
  return result;
}

// const stubs
export const frozenEmptyArray = Object.freeze([]);
export const frozenEmptyObject = Object.freeze(Object.create(null));


// primitive predicates
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
export const isFinite = Number.isFinite || (v=>typeof value === 'number' && isFinite(value));
export const isInteger = Number.isInteger || (v => isFinite(v) && v % 1 === 0);
export const isError = e=>isObjectLike(e) && typeof e.message === 'string';
export const isString = arg=>typeof arg==='string';
export const isFunction = arg=>typeof arg==='function';
export const isObjectLike = arg=>typeof arg==='object' && arg !== null;
export const isArray = Array.isArray.bind(Array);
export const is = val1=>val2=>val1===val2;
export const isUndefOrNull = val => val === undefined || val === null;
export const isProductionEnv = ()=>process.env.NODE_ENV === 'production';
export const isPromise = x=>typeof x==='object'&&x!==null&&typeof x.then==='function';
export const toPredicate = x=>{
  if(isFunction(x)) return x;
  if(isArray(x)) return matchesProperty(x);
  if(isObjectLike(x)) return matches(x);
  if(isString(x)) return hasKey(x)
  if(stubTrue(x)) return stubFalse;
};

// debugging
export const plog = (msg='')=>pipeVal=>console.log(msg,pipeVal) || pipeVal;

// flow
export const dpipe = (data,...args)=>pipe(...args)(data);
// functions
const makeCollectionFn=(arrayFn,objFn)=>(...args)=>ifElse(isArray,arrayFn(...args),objFn(...args));

export const acceptArrayOrArgs = fn=>(...args)=>args.length>1 ? fn(args) : fn(ensureArray(args[0]));
export const invokeArgsOnObj = (...args) => mapValues(fn=>fn(...args));
export const invokeObjectWithArgs = (obj)=>(...args) => mapValues(fn=>isFunction(fn) ? fn(...args) : fn)(obj);

export const overObj = (fnsObj={})=>(...args)=>{
  // console.log(`fnsObj`,fnsObj)
  return mo(f=>{
    if(typeof f!=='function')console.log('typeof f',f);
    return f(...args);
  })(fnsObj);
}
export const overArray = (fnsArray=[])=>(...args)=>ma(f=>f(...args))(fnsArray);
export const over = x=>isArray(x)?overArray(x):overObj(x);
export const converge = over;//backwards compat;

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
// export const matches=o=>mo(_is)(o)(v,k)=>ma(v)k=>o=>k in o;
// const matches=o=>and(ma((v,k)=>is)(o),(o)
export const not = fn=>(...args)=>!fn(...args);
export const ifElseUnary = (pred,T,F=identity)=>arg=>pred(arg)?T(arg):F(arg);
export const ifElse = (pred,T,F=identity)=>(...args)=>(pred(...args) ? T : F)(...args);
export const and = acceptArrayOrArgs((preds)=>(...args)=>{
  // console.log(`preds`,preds)
  for (const p of preds)if(p(...args)!==true)return false;
  return true;
});
export const or = acceptArrayOrArgs((preds)=>(...args)=>{
  for (const p of preds)if(p(...args)===true)return true;
  return false;
});
export const xor = acceptArrayOrArgs((preds)=>(...args)=>{
  let p,trues=0;
  for (p of preds)
    (p(...args)===true && (++trues));
  return trues===1;
});
export const _is = (x) => (y) => x===y;
export const hasKey=(k='')=>(coll={})=>k in coll;
export const matchesProperty=([k,v]=[])=>(o={})=>o[k]===v;
export const matches=(coll={})=>and(...mapToArray((v,k)=>matchesProperty([k,v]))(coll));
export const none = compose(not,or);
export const condNoExec = acceptArrayOrArgs(arrs=>(...x)=>{for (const [pred,val] of arrs) if(pred(...x)) return val;});
export const cond = acceptArrayOrArgs(arrs=>(...x)=>{for (const [pred, fn] of arrs) if (pred(...x)) return fn(...x);});



// Array methods

// collections

export const transArrayToObject = fn => (coll=[]) => {
  const l = coll.length, acc = Object.create(null);
  let k = -1;
  while (++k < l) fn(acc, coll[k], k, coll);
  return acc;
}
export const transArrayToArray = fn => (coll=[]) => {
  const l = coll.length, acc = [];
  let k = -1;
  while (++k < l) fn(acc, coll[k], k, coll);
  return acc;
}
export const transObjectToObject = fn => (coll={}) => {
  let k, acc = Object.create(null);
  for (k in coll) fn(acc, coll[k], k, coll);
  return acc;
}
export const transObjectToArray = fn => (coll={}) => {
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
export const immutableTransArrayToArray = fn => (coll=[]) => {
  let k, acc = [],changed=false;
  for (k of coll) {
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

export const transToObject = makeCollectionFn(transArrayToObject,transObjectToObject);
export const ro=transToObject; // backward compatability 
export const transToArray = makeCollectionFn(transArrayToArray,transObjectToArray);
export const ra=transToArray; // backward compatability
export const transToSame = makeCollectionFn(transArrayToArray,transObjectToObject);
export const rx = transToSame; // backward compatability
export const filterToArray =pred=>transToArray((a,v,k)=>pred(v,k)&&(a[a.length]=v)); // _ equiv filter
export const fa=filterToArray; // backward compatability
export const filterToObject=pred=>transToObject((a,v,k)=>pred(v,k)&&(a[k]=v)); // _ equiv pickBy
export const fo=filterToObject; // backward compatability
export const filterToSame=makeCollectionFn(filterToArray,filterToObject);
export const fx=filterToSame;// backward compatability
export const omitToArray=pred=>transToArray((a,v,k)=>!pred(v,k)&&(a[a.length]=v)); // _ equiv withoutBy
export const oa=omitToArray; // backward compatability
export const omitToObject=pred=>transToObject((a,v,k)=>!pred(v,k)&&(a[k]=v)); // _ equiv pickBy
export const oo=omitToObject; // backward compatability
export const omitToSame=makeCollectionFn(omitToArray,omitToObject);
export const ox=omitToSame; // backward compatability
export const mapToArray=fn=>transToArray((a,v,k)=>a[a.length]=fn(v,k)); // _ equiv map
export const ma=mapToArray; // backward compatability
export const mapToObject=fn=>transToObject((a,v,k)=>a[k]=fn(v,k)); // _ equiv mapValues
export const mo=mapToObject; // backward compatability
export const mapToSame=makeCollectionFn(mapToArray,mapToObject);
export const mx=mapToSame; // backward compatability
export const filterMapToArray = (pred,mapper)=>transToArray((a,v,k)=>pred(v,k)&&(a[a.length]=mapper(v,k)));
export const fma = filterMapToArray; // backward compatability
export const filterMapToObject = (pred,mapper)=>transToObject((o,v,k)=>pred(v,k)&&(o[k]=mapper(v,k)));
export const fmo = filterMapToObject; // backward compatability
export const filterMapToSame=makeCollectionFn(filterMapToArray,filterMapToObject);
export const fmx=filterMapToSame; // backward compatability

export const first = c=>{
  if (isArray(c)) return c[0];
  for (const k in c)return c[k];
}
export const last = c =>{
  c=isArray(c)?c:Object.values(c);
  return c[c.length-1];
}
const partitionObject = (...preds)=>overArray([...(preds.map(p=>fo(p))),fo(none(...preds))]);
const partitionArray = (...preds)=>overArray([...(preds.map(fa)),fa(none(...preds))]);
export const partition = makeCollectionFn(partitionArray,partitionObject);


// collection predicates
export const len = makeCollectionFn(
  num=>({length})=>length===num,
  num=>coll=>{
    let l=0,k;
    for (k in coll)if(++l>num)return false;
    return l===num;
  }
);
export const len0 = len(0);
export const len1 = len(1);
export const has = key=>obj=>key in obj;
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
export const pget = cond( // polymorphic get
  [isString,str=>{
    str=str.split('.');
    return targ=>str.reduce((t,s)=>isArray(t) && !isInteger(+s) ? t.map(o=>o[s]) : t[s], targ)
  }],
  [isArray,keys=>pick(keys)],
  [isObjectLike, obj=>target=>mo(f=>pget(f)(target))(obj)],
  [stubTrue,identity], // handles the function case
);
export const pick=cond(
  [isArray,keys=>obj=>transArrayToObject((o,k)=>o[k]=obj[k])(keys)],
  [isString,key=>obj=>({[key]:obj[key]})],
  [isFunction,filterToSame],
  [stubTrue,keys=>obj=>new Error('unsupported type for pick: '+typeof keys)]
);




// Objects

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
export const uniqueId = (()=>{
  let id=0;
  return (predix='')=>`${predix}${++id}`;
})();







export const transduce = (acc, itemCombiner , transducer, collection) =>
  tdReduceListValue(transducer(itemCombiner))(acc,collection);

export const appendArrayReducer = (acc=[],v)=>{acc[acc.length]=v;return acc;}
export const appendObjectReducer = (acc={},v,k)=>{acc[k]=v;return acc;}
export const tdToArray = transducer=>collection=>transduce([], appendArrayReducer, transducer, collection);
export const tdToObject = transducer=>collection=>transduce(({}), appendObjectReducer, transducer, collection);
export const tdToSame = transducer=>collection=>(Array.isArray(collection)?tdToArray:tdToObject)(transducer)(collection);
export const tdMap = mapper => nextReducer => (a,v,...kc) => nextReducer(a,mapper(v,...kc),...kc);
export const tdMapKey = mapper => nextReducer => (a,v,k,...c) => nextReducer(a,v,mapper(v,k,...c),...c);
export const tdMapWithAcc = mapper => nextReducer => (a,v,...kc) => nextReducer(a,mapper(a,v,...kc),...kc);
export const tdMapKeyWithAcc = mapper => nextReducer => (a,v,k,...c) => nextReducer(a,v,mapper(a,v,k,...c),...c);
export const tdAssign = f=>nextReducer => (a,v,...kc) =>nextReducer({...a,...f(a,v,...kc)},v,...kc);
export const tdSet = (key,f)=>nextReducer => (a,v,...kc) =>{
  const next = f(a,v,...kc);
  return a[key]===next?nextReducer(a,v,k,c):nextReducer({...a,[key]:next},v,...kc);
};
export const tdReduce = reducer => nextReducer => (a,...vkc) =>
  nextReducer(reducer(a,...vkc),...vkc);
export const tdIdentity = identity;
export const tdTap = fn => nextReducer => (...args) => {
  fn(...args);
  return nextReducer(...args);
};

export const tdLog = (msg='log',pred=stubTrue)=>tdTap((...args)=>pred(...args)&&console.log(msg,...args));
export const tdFilter = (pred=stubTrue) => nextReducer => (a,...args) => pred(...args) ? nextReducer(a,...args) : a;
export const tdFilterWithAcc = (pred=stubTrue) => nextReducer => (...args) => pred(...args) ? nextReducer(...args) : args[0];
export const tdOmit = pred=>tdFilter(not(pred));
export const tdOmitWithAcc = pred=>tdFilterWithAcc(not(pred));
export const tdPipeToArray = (...fns)=>tdToArray(compose(...fns));
export const tdPipeToObject = (...fns)=>tdToObject(compose(...fns));
export const tdDPipeToArray = (coll,...fns)=>tdToArray(compose(...fns))(coll);
export const tdDPipeToObject = (coll,...fns)=>tdToObject(compose(...fns))(coll);
export const tdReduceListValue = nextReducer=>(acc,v,k,...args)=>{
  if (!isObjectLike(v))
    return nextReducer(acc, v,k,...args);
  if (isArray(v))
    for(let kk=-1,l=v.length;++kk<l;) acc=nextReducer(acc, v[kk], kk, v);
  else
    for (const kk in v) acc=nextReducer(acc, v[kk], kk, v);
  return acc;
};
export const reduce = (fn) => (coll,acc) => tdReduceListValue(fn)(acc,coll);
export const tdIfElse=(pred,tdT,tdF=identity)=>nextReducer=>ifElse(pred,tdT(nextReducer),tdF(nextReducer));
const isReducerValueObjectLike=(a,v)=>isObjectLike(v);
export const tdIfValueObjectLike=transducer=>tdIfElse(isReducerValueObjectLike,transducer);
export const tdDfObjectLikeValuesWith=(getChildAcc=stubObject)=>tdIfValueObjectLike(
  nextReducer=>(a,v,k,c,childReducer)=>nextReducer(a,childReducer(getChildAcc(a,v,k,c),v),k,c),
);
export const transduceDF = ({
  preVisit=tdIdentity,
  visit=tdDfObjectLikeValuesWith(stubObject),
  postVisit=tdIdentity,
  edgeCombiner=(acc={},v,k)=>{acc[k]=v;return acc;},
  childrenLoopReducer=tdReduceListValue
}={})=>{
  const tempdfReducer = compose(
    preVisit,
    nextReducer=>(a,v,k,c)=>nextReducer(a,v,k,c,dfReducer),
    visit,
    postVisit,
  )(edgeCombiner);
  const dfReducer = childrenLoopReducer(tempdfReducer);
  return dfReducer;
};


export const transduceBF = ({
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
  const reduceItem = compose(
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