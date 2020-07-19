import { i as isObject } from './isObject.js-52553cde.js';
import { S as Stack } from './_Stack.js-283d3e23.js';
import { a as assignMergeValue } from './_assignMergeValue.js-4893b41f.js';
import { b as baseFor } from './_baseFor.js-abbb37ca.js';
import { s as safeGet } from './_safeGet.js-477e482b.js';
import { k as keysIn } from './keysIn.js-a456e211.js';
import { b as baseMergeDeep } from './_baseMergeDeep.js-9ff81186.js';

/**
 * The base implementation of `_.merge` without support for multiple sources.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    stack || (stack = new Stack);
    if (isObject(srcValue)) {
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
    }
    else {
      var newValue = customizer
        ? customizer(safeGet(object, key), srcValue, (key + ''), object, source, stack)
        : undefined;

      if (newValue === undefined) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn);
}

export { baseMerge as b };
