import { i as isKey } from './_isKey.js-20c1b706.js';
import { t as toKey } from './_toKey.js-00bd10e9.js';
import { b as baseIsEqual } from './_baseIsEqual.js-2081c9b2.js';
import { i as isStrictComparable } from './_isStrictComparable.js-a9828370.js';
import { m as matchesStrictComparable } from './_matchesStrictComparable.js-d19af892.js';
import { g as get } from './get.js-addb1d30.js';
import { h as hasIn } from './hasIn.js-2f0ad596.js';

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatchesProperty(path, srcValue) {
  if (isKey(path) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get(object, path);
    return (objValue === undefined && objValue === srcValue)
      ? hasIn(object, path)
      : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}

export { baseMatchesProperty as b };
