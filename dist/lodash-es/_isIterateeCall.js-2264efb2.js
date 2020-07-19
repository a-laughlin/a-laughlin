import { e as eq } from './eq.js-3067b71d.js';
import { i as isObject } from './isObject.js-52553cde.js';
import { i as isArrayLike } from './isArrayLike.js-a791d85f.js';
import { i as isIndex } from './_isIndex.js-75de89e7.js';

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

export { isIterateeCall as i };
