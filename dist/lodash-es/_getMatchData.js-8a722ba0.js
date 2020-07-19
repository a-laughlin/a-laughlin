import { k as keys } from './keys.js-f4a95bd3.js';
import { i as isStrictComparable } from './_isStrictComparable.js-a9828370.js';

/**
 * Gets the property names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = keys(object),
      length = result.length;

  while (length--) {
    var key = result[length],
        value = object[key];

    result[length] = [key, value, isStrictComparable(value)];
  }
  return result;
}

export { getMatchData as g };
