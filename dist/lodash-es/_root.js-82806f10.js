import { f as freeGlobal } from './_freeGlobal.js-ac63e052.js';

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

export { root as r };
