import pick from 'lodash/fp/pick'
import pickBy from 'lodash/fp/pickBy'
import get from 'lodash/fp/get'
import {default as mapFP} from 'lodash/fp/map'
import {default as transformFP} from 'lodash/fp/transform'
import flatten from 'lodash/fp/flatten'
import {default as mapValuesFP} from 'lodash/fp/mapValues'
import omit from 'lodash/fp/omit'
import omitBy from 'lodash/fp/omitBy'
import {default as reduceFP} from 'lodash/fp/reduce'
import spread from 'lodash/fp/spread'
import rest from 'lodash/fp/rest'
import {default as filterFP} from 'lodash/fp/filter'
import uniqueId from 'lodash/fp/uniqueId'
import {default as matchesFP} from 'lodash/fp/matches'
import concat from 'lodash/fp/concat'
import constant from 'lodash/fp/constant'
import overEvery from 'lodash/fp/overEvery'
import overSome from 'lodash/fp/overSome'
import negate from 'lodash/fp/negate'
import {default as flatMapFP} from 'lodash/fp/flatMap'
import flattenDeep from 'lodash/fp/flattenDeep'
import over from 'lodash/fp/over'
import identity from 'lodash/fp/identity'
import difference from 'lodash/fp/difference'
import isArray from 'lodash/fp/isArray'
import isInteger from 'lodash/fp/isInteger'
import isError from 'lodash/fp/isError'
import isNumber from 'lodash/fp/isNumber'
import isObjectLike from 'lodash/fp/isObjectLike'
import hasIn from 'lodash/fp/hasIn'
import has from 'lodash/fp/has'
import isWeakMap from 'lodash/fp/isWeakMap'
import isWeakSet from 'lodash/fp/isWeakSet'
import isMap from 'lodash/fp/isMap'
import isSet from 'lodash/fp/isSet'
import isEmpty from 'lodash/fp/isEmpty'
import isString from 'lodash/fp/isString'
import isPlainObject from 'lodash/fp/isPlainObject'
import isFunction from 'lodash/fp/isFunction'
import isNull from 'lodash/fp/isNull'
import isUndefined from 'lodash/fp/isUndefined'
import set from 'lodash/fp/set'
import unset from 'lodash/fp/unset'
import once from 'lodash/fp/once'
import sortBy from 'lodash/fp/sortBy'
import keyBy from 'lodash/fp/keyBy'
import every from 'lodash/fp/every'
import values from 'lodash/fp/values'
import keys from 'lodash/fp/keys'
import zip from 'lodash/fp/zip'
import unzip from 'lodash/fp/unzip'
import union from 'lodash/fp/union'
import conforms from 'lodash/fp/conforms'
import intersection from 'lodash/fp/intersection'
import nth from 'lodash/fp/nth'
import first from 'lodash/fp/first'
import last from 'lodash/fp/last'


import merge from 'lodash/merge'
import mergeWith from 'lodash/mergeWith'
import {default as _set} from 'lodash/set'


const [transform,filter,map,mapValues,reduce,flatMap] = [
  transformFP,filterFP,mapFP,mapValuesFP,reduceFP,flatMapFP].map(fn=>fn.convert({cap:false}));



// stubs

export const stubNull = ()=>null;
export const stubArray = ()=>[];
export const stubObject = ()=>({});
export const stubString = ()=>'';
export const stubTrue = ()=>true;
export const stubFalse = ()=>false;
export const noop = ()=>{};



// predicates
export {isArray,isError,isInteger,isNumber,isObjectLike,hasIn,has,isWeakMap,isWeakSet,isMap,
  isSet,isEmpty,isString,isPlainObject,isFunction,isNull,isUndefined,every,conforms}
export const isFalsy = arg=>!arg;
export const isTruthy = arg=>!!arg;
export const is = val1=>val2=>val1===val2;
export const isUndefOrNull = val => val == undefined; // eslint-disable-line
export const isPromise = x=>!isUndefOrNull(x) && typeof x.then == 'function';
export const len = num=>({length})=>length===num;
export const len0 = len(0);
export const len1 = len(1);
export const isProductionEnv = ()=>process.env.NODE_ENV === 'production';
export const matches = arg=>matchesFP(arg);

// debugging
export const plog = (msg='')=>pipeVal=>console.log(msg,pipeVal) || pipeVal;

// flow
export {once,over};
export const pipe = (fn=identity,...fns)=>(arg1,...args)=>{
  let nextfn;
  let result = fn(arg1,...args);
  for (nextfn of fns){
    result=nextfn(result);
  }
  return result;
}
export const dpipe = (data,...args)=>pipe(...args)(data);
export const compose = (...fns)=>pipe(...fns.reverse());

// functions
export {spread,rest,identity}
export const acceptArrayOrArgs = fn=>(...args)=>args.length>1 ? fn(args) : fn(...args);
export const invokeArgsOnObj = (...args) => mapValues(fn=>fn(...args));
export const invokeObjectWithArgs = (obj)=>(...args) => mapValues(fn=>isFunction(fn) ? fn(...args) : fn)(obj);
export const mergeToBlank = acceptArrayOrArgs(vals => merge({},...vals));

export const overObj = obj=>(...args)=>mo(f=>f(...args))(obj);
export const converge = (arg)=>(isArray(arg)?over:overObj)(arg);

// casting
export {constant};
export const ensureArray = (val=[])=>isArray(val) ? val : [val];
export const ensureFunction = (arg)=>typeof arg==='function'?arg:constant(arg);
export const ensurePropExists = fn=>(obj,key)=>obj.hasOwnProperty(key) ? obj[key] : (obj[key]=fn());
export const ensurePropIsArray = ensurePropExists(stubArray);
export const ensurePropIsObject = ensurePropExists(stubObject);

// logic
export const not = negate;
export const ifElse = (pred,T,F=identity)=>(...args)=>(pred(...args) ? T : F)(...args);
export const ife = ifElse;
export const and = rest(overEvery);
export const or = rest(overSome);
export const none = not(or);
export const xor = fn=>pipe(filter(fn),len1);
export const condNoExec = acceptArrayOrArgs(arrs=>(...x)=>{for (let [pred,val] of arrs){if(pred(...x)){return val;}}});
export const cond = acceptArrayOrArgs(arrs=>(...args)=>ensureFunction(condNoExec(...arrs)(...args))(...args));



// Array methods
export {concat,sortBy,zip,unzip,difference,union,intersection};
export const slice = (...sliceArgs)=>arr=>arr.slice(...sliceArgs);
export const reverse = arr=>arr.slice(0).reverse(); // immutable array reverse
export const sort = sortBy(null)




// collections
// shortcuts for the most common collection operations
// prefixes = r,m,f,o,fm = reduce,map,filter,omit,filter+map
// suffixes = o,a,x = toObject,toArray,toX (where X is the same type as input)
export {reduce,merge,mergeWith,flatMap,flattenDeep,flatten};
export const ro=fn=>(...args)=>transform(fn,{})(...args);
export const ra=fn=>(...args)=>transform(fn,[])(...args);
export const ma=map;
export const mo=fn=>ifElse(isArray,ro((acc,v,i,c)=>{acc[i]=fn(v,i,c);}),mapValues)(fn);
export const fa=filter;
export const fo = cond(
  [isArray,pred=>ife(isArray,ro((o,v,i,c)=>{if(pred.includes(v)){o[i]=v;}}), pick(pred))],
  [isFunction,pred=>ife(isArray,ro((o,v,i,c)=>{if(pred(v,i,c)){o[i]=v;}}),pickBy(pred))],
  [isString,pipe(ensureArray,pred=>fo(pred))],
);
export const oa=pipe(not,fa);
export const oo = cond(
  [isFunction,pred=>ife(isArray,fo(not(pred)),omitBy(pred))],
  [isArray,pred=>ife(isArray,ro((o,v,i,c)=>{if(!pred.includes(v)){o[i]=v;}}), omit(pred)) ],
  [isString,pipe(ensureArray,pred=>oo(pred))],
);
export const fma=(pred,fn)=>ra((a,v,k,c)=>{if(pred(v,k,c)){a[a.length]=fn(v,k,c);}});
export const fmo=(pred,fn)=>ro((o,v,k,c)=>{if(pred(v,k,c)){o[k]=fn(v,k,c);}});
// partionObject((v,k)=>k=='a',(v,k)=>k!='a')({a:1,b:2,c:3}) =>[{a:1},{b:1,c:2}]
// partionObject((v,k)=>v==1,(v,k)=>v!=1)({a:1,b:2,c:3}) =>[{a:1,b:1},{c:2}]
// partionObject((v,k)=>v==1)({a:1,b:2,c:3}) =>[{a:1,b:1},{c:2}]
const partitionObject = (...preds)=>over([...(preds.map(fo)),fo(none(preds))]);
const partitionArray = (...preds)=>over([...(preds.map(fa)),fa(none(preds))]);
export const partition = ifElse(isArray,partitionArray,partitionObject);


// getters
export {get,set,_set,unset,nth,first,last,keyBy};
export const pget = cond(
  [isString,str=>{
    str=str.split('.');
    return targ=>str.reduce((t,s)=>isArray(t) && !isInteger(+s) ? t.map(o=>o[s]) : t[s], targ)
  }],
  [isArray,pick],
  [isPlainObject, obj=>target=>mo(f=>pget(f)(target))(obj)],
  [stubTrue,identity], // handles the function case
);
export const groupByKeys = ro((o,item,ik,c)=>{
  for (const k in item){ensurePropIsArray(o,k).push(item)}
})
export const groupByValues = ro((o,item,k,c)=>{
  for (const k in item){
    for (const v of ensureArray(item[k])){
      ensurePropIsArray(o,`${v}`).push(item);
    }
  }
});



// Objects
export {values,keys}
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
export {uniqueId}
