import { b as baseGetAllKeys } from './_baseGetAllKeys.js-d353ff0c.js';
import { g as getSymbols } from './_getSymbols.js-aee7efbf.js';
import { k as keys } from './keys.js-f4a95bd3.js';

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

export { getAllKeys as g };
