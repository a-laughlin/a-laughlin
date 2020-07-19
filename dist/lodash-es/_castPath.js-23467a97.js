import { i as isArray } from './isArray.js-348c388d.js';
import { i as isKey } from './_isKey.js-20c1b706.js';
import { s as stringToPath } from './_stringToPath.js-14426231.js';
import { t as toString } from './toString.js-054ab19d.js';

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}

export { castPath as c };
