import { i as isObject } from './isObject.js-52553cde.js';
import { i as isFunction } from './isFunction.js-e7b830c1.js';
import { a as assignMergeValue } from './_assignMergeValue.js-4893b41f.js';
import { c as cloneBuffer } from './_cloneBuffer.js-fda27ee5.js';
import { c as cloneTypedArray } from './_cloneTypedArray.js-cdcdcc65.js';
import { c as copyArray } from './_copyArray.js-60683993.js';
import { i as initCloneObject } from './_initCloneObject.js-451623ee.js';
import { i as isArguments } from './isArguments.js-49778255.js';
import { i as isArray } from './isArray.js-348c388d.js';
import { i as isArrayLikeObject } from './isArrayLikeObject.js-9ec94c2e.js';
import { i as isBuffer } from './isBuffer.js-b51562a3.js';
import { i as isPlainObject } from './isPlainObject.js-f82871af.js';
import { i as isTypedArray } from './isTypedArray.js-5ad2fd2e.js';
import { s as safeGet } from './_safeGet.js-477e482b.js';
import { t as toPlainObject } from './toPlainObject.js-abc6a198.js';

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  var objValue = safeGet(object, key),
      srcValue = safeGet(source, key),
      stacked = stack.get(srcValue);

  if (stacked) {
    assignMergeValue(object, key, stacked);
    return;
  }
  var newValue = customizer
    ? customizer(objValue, srcValue, (key + ''), object, source, stack)
    : undefined;

  var isCommon = newValue === undefined;

  if (isCommon) {
    var isArr = isArray(srcValue),
        isBuff = !isArr && isBuffer(srcValue),
        isTyped = !isArr && !isBuff && isTypedArray(srcValue);

    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray(objValue)) {
        newValue = objValue;
      }
      else if (isArrayLikeObject(objValue)) {
        newValue = copyArray(objValue);
      }
      else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue, true);
      }
      else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue, true);
      }
      else {
        newValue = [];
      }
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      }
      else if (!isObject(objValue) || isFunction(objValue)) {
        newValue = initCloneObject(srcValue);
      }
    }
    else {
      isCommon = false;
    }
  }
  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    stack.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
    stack['delete'](srcValue);
  }
  assignMergeValue(object, key, newValue);
}

export { baseMergeDeep as b };
