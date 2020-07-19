import { b as baseFor } from './_baseFor.js-abbb37ca.js';
import { k as keys } from './keys.js-f4a95bd3.js';

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

export { baseForOwn as b };
