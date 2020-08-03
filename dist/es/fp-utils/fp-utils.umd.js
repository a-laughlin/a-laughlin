(function(g,f){typeof exports==='object'&&typeof module!=='undefined'?f(exports):typeof define==='function'&&define.amd?define(['exports'],f):(g=typeof globalThis!=='undefined'?globalThis:g||self,f(g.FpUtils={}));}(this,(function(exports){'use strict';/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();/** Built-in value references. */
var Symbol = root.Symbol;/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$1.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString$1.call(value);
}/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag$1 = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag$1 && symToStringTag$1 in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}/**
 * Checks if `value` is an integer.
 *
 * **Note:** This method is based on
 * [`Number.isInteger`](https://mdn.io/Number/isInteger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an integer, else `false`.
 * @example
 *
 * _.isInteger(3);
 * // => true
 *
 * _.isInteger(Number.MIN_VALUE);
 * // => false
 *
 * _.isInteger(Infinity);
 * // => false
 *
 * _.isInteger('3');
 * // => false
 */
function isInteger(value) {
  return typeof value == 'number' && value == toInteger(value);
}/** `Object#toString` result references. */
var numberTag = '[object Number]';

/**
 * Checks if `value` is classified as a `Number` primitive or object.
 *
 * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are
 * classified as numbers, use the `_.isFinite` method.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a number, else `false`.
 * @example
 *
 * _.isNumber(3);
 * // => true
 *
 * _.isNumber(Number.MIN_VALUE);
 * // => true
 *
 * _.isNumber(Infinity);
 * // => true
 *
 * _.isNumber('3');
 * // => false
 */
function isNumber(value) {
  return typeof value == 'number' ||
    (isObjectLike(value) && baseGetTag(value) == numberTag);
}/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;/** Used as references for various `Number` constants. */
var INFINITY$1 = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
}/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}/** Used to generate unique IDs. */
var idCounter = 0;

/**
 * Generates a unique ID. If `prefix` is given, the ID is appended to it.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {string} [prefix=''] The value to prefix the ID with.
 * @returns {string} Returns the unique ID.
 * @example
 *
 * _.uniqueId('contact_');
 * // => 'contact_104'
 *
 * _.uniqueId();
 * // => '105'
 */
function uniqueId(prefix) {
  var id = ++idCounter;
  return toString(prefix) + id;
}// curry/compose/pipe, for later fns

const identity=x=>x;
if(typeof globalThis.process==='undefined'){
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
const isError = and(isObjectLike$1,e=>typeof e.message === 'string');
const isString = arg=>typeof arg==='string';
const isFunction = arg=>typeof arg==='function';
const isObjectLike$1 = arg=>typeof arg==='object' && arg !== null;
const isArray$1 = Array.isArray.bind(Array);
const isFalsy = arg=>!arg;
const isTruthy = arg=>!!arg;
const is = val1=>val2=>val1===val2;
const isUndefOrNull = val => val === undefined || val === null;
const isProductionEnv = ()=>process.env.NODE_ENV === 'production';
const isPromise = x=>typeof x==='object'&&x!==null&&typeof x.then==='function';


// debugging
const plog = (msg='')=>pipeVal=>console.log(msg,pipeVal) || pipeVal;

// flow
const dpipe = (data,...args)=>exports.pipe(...args)(data);
// functions
const makeCollectionFn=(arrayFn,objFn)=>(...args)=>{
  const aFn=arrayFn(...args);
  const oFn=objFn(...args);
  return ifElse(isArray$1,aFn,oFn);
};
const acceptArrayOrArgs = fn=>(...args)=>args.length>1 ? fn(args) : fn(...args);
const invokeArgsOnObj = (...args) => mapValues(fn=>fn(...args));
const invokeObjectWithArgs = (obj)=>(...args) => mapValues(fn=>isFunction(fn) ? fn(...args) : fn)(obj);

const overObj = fnsObj=>(...args)=>mo(f=>f(...args))(fnsObj);
const overArray = fnsArray=>(...args)=>ma(f=>f(...args))(fnsArray);
const over = x=>isArray$1(x)?overArray(x):overObj(x);
const converge = over;//backwards compat;

// casting
const constant = x=>_=>x;
const ensureArray = (val=[])=>isArray$1(val) ? val : [val];
const ensureString = (val)=>isString(val) ? val : `${val}`;
const ensureFunction = (arg)=>typeof arg==='function'?arg:constant(arg);
const ensureProp = (obj,key,val)=>{obj.hasOwnProperty(key) ? obj[key] : (obj[key]=val);return obj;};
const ensurePropWith = fn=>(obj,key,val)=>ensureProp(obj,key,fn(obj,key,val));
const ensurePropIsArray = ensurePropWith(stubArray);
const ensurePropIsObject = ensurePropWith(stubObject);

// logic
const not = fn=>(...args)=>!fn(...args);
const ifElseUnary = (pred,T,F=identity)=>arg=>pred(arg)?T(arg):F(arg);
const ifElse = (pred,T,F=identity)=>(...args)=>(pred(...args) ? T : F)(...args);
const and = (...preds)=>(...args)=>{
  for (const p of preds)if(p(...args)!==true)return false;
  return true;
};
const or = (...preds)=>(...args)=>{
  for (const p of preds)if(p(...args)===true)return true;
  return false;
};
const none = (...fns)=>not(or(...fns));
const xor = fn=>exports.pipe(filter(fn),len1);
const condNoExec = acceptArrayOrArgs(arrs=>(...x)=>{for (let [pred,val] of arrs){if(pred(...x)){return val;}}});
const cond = acceptArrayOrArgs(arrs=>(...args)=>ensureFunction(condNoExec(...arrs)(...args))(...args));



// Array methods
const slice = (...sliceArgs)=>arr=>arr.slice(...sliceArgs);
const reverse = arr=>arr.slice(0).reverse(); // immutable array reverse
const sort = coll=>_sortBy(coll,null);




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
  if (isArray$1(c)) return c[0];
  for (const k in c)return c[k];
};
const last = c =>{
  c=isArray$1(c)?c:Object.values(c);
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
    return targ=>str.reduce((t,s)=>isArray$1(t) && !isInteger(+s) ? t.map(o=>o[s]) : t[s], targ)
  }],
  [isArray$1,keys=>pick(keys)],
  [isObjectLike$1, obj=>target=>mo(f=>pget(f)(target))(obj)],
  [stubTrue,identity], // handles the function case
);
const pick=cond(
  [isArray$1,keys=>obj=>transToSame((o,k)=>o[k]=obj[k])(keys)],
  [isString,k=>pick([k])],
  [isFunction,filterToSame],
);




// Objects

const renameProps = obj=>target=>{
  let newKey,oldKey,targetCopy = {...target};
  for (newKey in obj){
    oldKey=obj[newKey];
    targetCopy[newKey]=target[oldKey];
    delete targetCopy[oldKey];
  }
  return targetCopy;
};
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







const transduce = (acc, itemCombiner , transducer, collection) =>
  tdReduceListValue(transducer(itemCombiner))(acc,collection);

const appendArrayReducer = (acc=[],v)=>{acc[acc.length]=v;return acc;};
const appendObjectReducer = (acc={},v,k)=>{acc[k]=v;return acc;};
const tdToArray = transducer=>collection=>transduce([], appendArrayReducer, transducer, collection);
const tdToObject = transducer=>collection=>transduce(({}), appendObjectReducer, transducer, collection);
const tdToSame = transducer=>collection=>(Array.isArray(collection)?tdToArray:tdToObject)(transducer)(collection);
const tdValue = transducer=>value=>transduce(undefined, identity, transducer, [value]);

const tdMap = mapper => nextReducer => (a,v,...kc) =>
  nextReducer(a,mapper(v,...kc),...kc);
const tdMapWithAcc = mapper => nextReducer => (a,v,...kc) =>
  nextReducer(a,mapper(a,v,...kc),...kc);
const tdAssign = f=>nextReducer => (a,v,...kc) =>nextReducer({...a,...f(a,v,...kc)},v,...kc);
const tdSet = (key,f)=>nextReducer => (a,v,...kc) =>nextReducer({...a,[key]:f(a,v,...kc)},v,...kc);
const tdReduce = reducer => nextReducer => (a,...vkc) =>
  nextReducer(reducer(a,...vkc),...vkc);
const tdIdentity = identity;
const tdTap = fn => nextReducer => (...args) => {
  fn(...args);
  return nextReducer(...args);
};

const tdLog = (msg='log',pred=stubTrue)=>tdTap((...args)=>pred(...args)&&console.log(msg,...args));
const tdFilter = (pred=stubTrue) => nextReducer => (a,...args) =>
  pred(...args) ? nextReducer(a,...args) : a;
const tdFilterWithAcc = (pred=stubTrue) => nextReducer => (...args) =>
  pred(...args) ? nextReducer(...args) : args[0];
const tdNormalizePromises = nextReducer => (acc,v,...args)=>{
  if (isPromise(acc)){
    return isPromise(v)
      ? Promise.all([acc,v]).then(([aa,vv])=>nextReducer(aa,vv,...args))
      : acc.then(aa=>nextReducer(aa,v,...args));
  }
  if (isPromise(v)){
    return v.then(vv=>nextReducer(acc,vv,...args))
  }
  return nextReducer(acc,v,...args);
};
const tdOmit = pred=>tdFilter(not(pred));
const tdOmitWithAcc = pred=>tdFilterWithAcc(not(pred));
const tdPipeToArray = (...fns)=>tdToArray(exports.compose(...fns));
const tdPipeToObject = (...fns)=>tdToObject(exports.compose(...fns));
const tdDPipeToArray = (coll,...fns)=>tdToArray(exports.compose(...fns))(coll);
const tdDPipeToObject = (coll,...fns)=>tdToObject(exports.compose(...fns))(coll);
const tdReduceListValue = nextReducer=>(acc,v,k,...args)=>{
  if (!isObjectLike$1(v))
    return nextReducer(acc, v,k,...args);
  if (isArray$1(v)) {
    for (let kk=-1, l=v.length;++kk < l;){
      (acc=isPromise(acc)
        ? Promise.all([acc,v[kk]]).then(([aa,vv])=>nextReducer(aa, vv, kk, v))
        : nextReducer(acc, v[kk], kk, v));
    }
    return acc;
  }
  let kk;
  for (kk in v){
    (acc=isPromise(acc)
      ? Promise.all([acc,v[kk]]).then(([aa,vv])=>nextReducer(aa, vv, kk, v))
      : nextReducer(acc, v[kk], kk, v));
  }
  return acc;
};

const reduce = (fn) => (coll,acc) => tdReduceListValue(fn)(acc,coll);
const tdIfElse=(pred,tdT,tdF=identity)=>nextReducer=>ifElse(pred,tdT(nextReducer),tdF(nextReducer));
const tdCond=acceptArrayOrArgs(predTransducerPairs=>{
  if(predTransducerPairs.length===0)
      return itentity; // noop
  if(predTransducerPairs.length===1) // single function passed, act like filterWithAcc
    return ifElse(predTransducerPairs[0],identity,noop);
  if(predTransducerPairs.length===2) // conditionally reduce
    return tdIfElse(predTransducerPairs[0],predTransducerPairs[1]);
  return nextReducer=>cond(
    pushToArray(predTransducerPairs.map(([pred,td])=>[pred,td(nextReducer)]),[stubTrue,nextReducer])
  );
});
const isReducerValueObjectLike=(a,v)=>isObjectLike$1(v);
const tdIfValueObjectLike=transducer=>tdIfElse(isReducerValueObjectLike,transducer);
const tdDfObjectLikeValuesWith=(getChildAcc=stubObject)=>tdIfValueObjectLike(
  nextReducer=>(a,v,k,c,childReducer)=>nextReducer(a,childReducer(getChildAcc(a,v,k,c),v),k,c),
);
const transduceDF = ({
  descentTransducer=tdIdentity,
  visitTransducer=tdDfObjectLikeValuesWith(stubObject),
  ascentTransducer=tdIdentity,
  edgeCombiner=(acc={},v,k)=>{acc[k]=v;return acc;},
  childrenLoopReducer=tdReduceListValue
}={})=>{
  const tempdfReducer = exports.compose(
    descentTransducer,
    nextReducer=>(a,v,k,c)=>nextReducer(a,v,k,c,dfReducer),
    visitTransducer,
    ascentTransducer,
  )(edgeCombiner);
  const dfReducer = childrenLoopReducer(tempdfReducer);
  return dfReducer;
  // return (a,v,k,c)=>isObjectLike(v) ? dfReducer(a,v,k,c) : tempdfReducer(a,v,k,c);
};


const transduceBF = ({
  preVisitTransducer=tdIdentity,
  visitTransducer=tdIdentity,//tdBfObjectLikeValuesWith(stubObject),
  postVisitTransducer=tdIdentity,
  edgeCombiner=(acc={},v,k)=>{acc[k]=v;return acc;},
  childrenLoopReducer=tdReduceListValue,
}={})=>{
  let queue=[];
  const pushNextQueueItems = childrenLoopReducer((aa,vv,kk,cc)=>{// push next level
    pushToArray(queue,[aa,vv,kk,cc]);
    return aa;
  });
  const reduceItem = exports.compose(
    preVisitTransducer,
    nextReducer=>(a,v,k,c)=>{
      if (isObjectLike$1(v)){
        const childAcc={};
        nextReducer(a,childAcc,k,c); // combine levels
        pushNextQueueItems(childAcc,v,k,c);
      } else {
        nextReducer(a,v,k,c);
      }
      if(queue.length>0)
        reduceItem(...queue.shift());
    },
    postVisitTransducer
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
const diffBy = (by=x=>x.id, args = []) => by ? diffObjs(...args.map(keyBy(by))) : diffObjs(args);exports.acceptArrayOrArgs=acceptArrayOrArgs;exports.and=and;exports.appendArrayReducer=appendArrayReducer;exports.appendObjectReducer=appendObjectReducer;exports.cond=cond;exports.condNoExec=condNoExec;exports.constant=constant;exports.converge=converge;exports.diffBy=diffBy;exports.diffObjs=diffObjs;exports.dpipe=dpipe;exports.ensureArray=ensureArray;exports.ensureFunction=ensureFunction;exports.ensureProp=ensureProp;exports.ensurePropIsArray=ensurePropIsArray;exports.ensurePropIsObject=ensurePropIsObject;exports.ensurePropWith=ensurePropWith;exports.ensureString=ensureString;exports.fa=fa;exports.filterMapToArray=filterMapToArray;exports.filterMapToObject=filterMapToObject;exports.filterMapToSame=filterMapToSame;exports.filterToArray=filterToArray;exports.filterToObject=filterToObject;exports.filterToSame=filterToSame;exports.first=first;exports.fma=fma;exports.fmo=fmo;exports.fmx=fmx;exports.fo=fo;exports.frozenEmptyArray=frozenEmptyArray;exports.frozenEmptyObject=frozenEmptyObject;exports.fx=fx;exports.groupBy=groupBy;exports.groupByKeys=groupByKeys;exports.groupByValues=groupByValues;exports.has=has;exports.identity=identity;exports.ifElse=ifElse;exports.ifElseUnary=ifElseUnary;exports.immutableFilterObjectToObject=immutableFilterObjectToObject;exports.immutableTransArrayToArray=immutableTransArrayToArray;exports.immutableTransObjectToObject=immutableTransObjectToObject;exports.invokeArgsOnObj=invokeArgsOnObj;exports.invokeObjectWithArgs=invokeObjectWithArgs;exports.is=is;exports.isArray=isArray$1;exports.isDeepEqual=isDeepEqual;exports.isError=isError;exports.isFalsy=isFalsy;exports.isFunction=isFunction;exports.isInteger=isInteger;exports.isNumber=isNumber;exports.isObjectLike=isObjectLike$1;exports.isProductionEnv=isProductionEnv;exports.isPromise=isPromise;exports.isString=isString;exports.isTruthy=isTruthy;exports.isUndefOrNull=isUndefOrNull;exports.keyBy=keyBy;exports.last=last;exports.len=len;exports.len0=len0;exports.len1=len1;exports.ma=ma;exports.mapToArray=mapToArray;exports.mapToObject=mapToObject;exports.mapToSame=mapToSame;exports.memoize=memoize;exports.mo=mo;exports.mx=mx;exports.none=none;exports.noop=noop;exports.not=not;exports.oa=oa;exports.objStringifierFactory=objStringifierFactory;exports.objToUrlParams=objToUrlParams;exports.omitToArray=omitToArray;exports.omitToObject=omitToObject;exports.omitToSame=omitToSame;exports.oo=oo;exports.or=or;exports.over=over;exports.overArray=overArray;exports.overObj=overObj;exports.ox=ox;exports.partition=partition;exports.pget=pget;exports.pick=pick;exports.plog=plog;exports.ra=ra;exports.range=range;exports.reduce=reduce;exports.renameProps=renameProps;exports.reverse=reverse;exports.ro=ro;exports.rx=rx;exports.slice=slice;exports.sort=sort;exports.stubArray=stubArray;exports.stubFalse=stubFalse;exports.stubNull=stubNull;exports.stubObject=stubObject;exports.stubString=stubString;exports.stubTrue=stubTrue;exports.tdAssign=tdAssign;exports.tdCond=tdCond;exports.tdDPipeToArray=tdDPipeToArray;exports.tdDPipeToObject=tdDPipeToObject;exports.tdDfObjectLikeValuesWith=tdDfObjectLikeValuesWith;exports.tdFilter=tdFilter;exports.tdFilterWithAcc=tdFilterWithAcc;exports.tdIdentity=tdIdentity;exports.tdIfElse=tdIfElse;exports.tdIfValueObjectLike=tdIfValueObjectLike;exports.tdKeyBy=tdKeyBy;exports.tdLog=tdLog;exports.tdMap=tdMap;exports.tdMapWithAcc=tdMapWithAcc;exports.tdNormalizePromises=tdNormalizePromises;exports.tdOmit=tdOmit;exports.tdOmitWithAcc=tdOmitWithAcc;exports.tdPipeToArray=tdPipeToArray;exports.tdPipeToObject=tdPipeToObject;exports.tdReduce=tdReduce;exports.tdReduceListValue=tdReduceListValue;exports.tdSet=tdSet;exports.tdTap=tdTap;exports.tdToArray=tdToArray;exports.tdToObject=tdToObject;exports.tdToSame=tdToSame;exports.tdValue=tdValue;exports.transToArray=transToArray;exports.transToObject=transToObject;exports.transToSame=transToSame;exports.transduce=transduce;exports.transduceBF=transduceBF;exports.transduceDF=transduceDF;exports.uniqueId=uniqueId;exports.xor=xor;Object.defineProperty(exports,'__esModule',{value:true});})));