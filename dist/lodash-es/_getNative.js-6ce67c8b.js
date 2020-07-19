import { b as baseIsNative } from './_baseIsNative.js-c2ce2406.js';
import { g as getValue } from './_getValue.js-18c9d5bc.js';

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

export { getNative as g };
