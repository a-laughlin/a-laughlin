import { i as isArray } from './isArray.js-348c388d.js';
import { i as identity } from './identity.js-ddb76187.js';
import { b as baseMatches } from './_baseMatches.js-39913338.js';
import { b as baseMatchesProperty } from './_baseMatchesProperty.js-5334e4c8.js';
import { p as property } from './property.js-ddd8f638.js';

/**
 * The base implementation of `_.iteratee`.
 *
 * @private
 * @param {*} [value=_.identity] The value to convert to an iteratee.
 * @returns {Function} Returns the iteratee.
 */
function baseIteratee(value) {
  // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
  // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
  if (typeof value == 'function') {
    return value;
  }
  if (value == null) {
    return identity;
  }
  if (typeof value == 'object') {
    return isArray(value)
      ? baseMatchesProperty(value[0], value[1])
      : baseMatches(value);
  }
  return property(value);
}

export { baseIteratee as b };
