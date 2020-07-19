import './_commonjsHelpers.js-51d3728a.js';
import { x as xstream, c as concat_1, f as fromDiagram_1, a as fromEvent_1, t as tween_1, b as buffer_1, d as debounce_1, e as delay_1, g as dropRepeats_1, h as dropUntil_1, i as flattenConcurrently_1, j as flattenSequentially_1, p as pairwise_1, s as sampleCombine_1, k as split_1, l as throttle_1 } from './xstream/xstream-ee4e4a1b.js';

// factories
const xs = xstream;
const of$ = xs.of.bind(xs);
const from$ = xs.from.bind(xs);
const fromArray$ = xs.fromArray.bind(xs);
const fromPromise$ = xs.fromPromise.bind(xs);
const create$ = xs.create.bind(xs);
const never$ = xs.never.bind(xs);
const empty$ = xs.empty.bind(xs);
const throw$ = xs.throw.bind(xs);
const periodic$ = xs.periodic.bind(xs);
const merge$ = xs.merge.bind(xs);
const combine$ = xs.combine.bind(xs);
// extras factories
const concat$ = concat_1;
const fromDiagram$ = fromDiagram_1;
const fromEvent$ = fromEvent_1;
const tween$ = tween_1;




// Methods/Operators
// Methods are functions attached to a Stream instance, like stream.addListener().
// Operators are also methods, but return a new Stream, leaving the existing Stream unmodified,
// except for the fact that it has a child Stream attached as Listener. Documentation doesn't say
// which is which
// methods - mutate the existing stream
const getListener = ({
  next=x=>x,
  error=x=>{throw Error(x);},
  complete=x=>x,
}={})=>({next,error,complete});
const addListener = (obj)=>s=>{s.addListener(getListener(obj));return s;}; // return stream for consistent api
const getDebugListener = (msg='debug')=>getListener({
  next : console.log.bind(console,msg,'next'),
  error : e =>{console.log(msg,'error');console.error(e);},
  complete : console.log.bind(console,msg,'complete'),
});
const setDebugListener = msg=>{
  return typeof msg === 'string'
    ? s=>s.setDebugListener(getDebugListener(msg))
    : setDebugListener(getDebugListener('debug'))(msg);
};
const addDebugListener = msg=>{
  return typeof msg === 'string'
    ? addListener(getDebugListener(msg))
    : addDebugListener('debug')(msg);
};
const imitate = (...a)=>s=>{s.imitate(...a); return s};

// operators - existing stream unmodified. Receives new stream as a listener.  Return new stream.
const debug = (...a)=>s=>s.debug(...a);
const drop = (...a)=>s=>s.drop(...a);
const endWhen = (...a)=>s=>s.endWhen(...a);
const filter = (...a)=>s=>s.filter(...a);
const fold = (...a)=>s=>s.fold(...a); // - returns MemoryStream
const last = (...a)=>s=>s.last(...a);
const map = (...a)=>s=>s.map(...a);
const mapTo = (...a)=>s=>s.mapTo(...a);
const removeListener = (...a)=>s=>s.removeListener(...a);
const replaceError = (...a)=>s=>s.replaceError(...a);
const shamefullySendComplete = (...a)=>s=>s.shamefullySendComplete(...a);
const shamefullySendError = (...a)=>s=>s.shamefullySendError(...a);
const shamefullySendNext = (...a)=>s=>s.shamefullySendNext(...a);
const startWith = (...a)=>s=>s.startWith(...a); // - returns MemoryStream
const subscribe = obj=>s=>s.subscribe(getListener(obj));
const take = (...a)=>s=>s.take(...a);
// these make life easier when working with normal pipes
const mergeWith = (...streams)=>stream=>xs.merge(stream,...streams);
const combineWith = (...streams)=>stream=>xs.combine(stream,...streams);
// these don't take args
const remember = s=>s.remember();
const flatten = s=>s.flatten();


// extras operators
const buffer = (...args)=>stream=>stream.compose(buffer_1(...args));
const debounce = (...args)=>stream=>stream.compose(debounce_1(...args));
const delay = (...args)=>stream=>stream.compose(delay_1(...args));
const dropRepeats = stream=>stream.compose(dropRepeats_1());
const dropUntil = (...args)=>stream=>stream.compose(dropUntil_1(...args));
const flattenConcurrently = stream=>stream.compose(flattenConcurrently_1);
const flattenSequentially = stream=>stream.compose(flattenSequentially_1);
const pairwise = (...args)=>stream=>stream.compose(pairwise_1(...args));
const sampleCombine = (...args)=>stream=>stream.compose(sampleCombine_1(...args));
const split = (...args)=>stream=>stream.compose(split_1(...args));
const throttle = (...args)=>stream=>stream.compose(throttle_1(...args));
const flatMap = fn=>s=>s.map(fn).compose(flattenConcurrently);
const concatMap = fn=>s=>s.map(fn).compose(flattenSequentially);
const flatMapLatest = fn=>s=>s.map(fn).flatten();
const toArray = fn=>s=>s.compose(buffer(never$()));

export { addDebugListener, addListener, buffer, combine$, combineWith, concat$, concatMap, create$, debounce, debug, delay, drop, dropRepeats, dropUntil, empty$, endWhen, filter, flatMap, flatMapLatest, flatten, flattenConcurrently, flattenSequentially, fold, from$, fromArray$, fromDiagram$, fromEvent$, fromPromise$, getDebugListener, getListener, imitate, last, map, mapTo, merge$, mergeWith, never$, of$, pairwise, periodic$, remember, removeListener, replaceError, sampleCombine, setDebugListener, shamefullySendComplete, shamefullySendError, shamefullySendNext, split, startWith, subscribe, take, throttle, throw$, toArray, tween$, xs };
