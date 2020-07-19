import { b as baseGetTag } from './_baseGetTag.js-f3ef6f41.js';
import { i as isObjectLike } from './isObjectLike.js-bf43cd33.js';

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

export { baseIsArguments as b };
