import { h as hasIn } from './hasIn.js-2f0ad596.js';
import { b as basePickBy } from './_basePickBy.js-9e8e587d.js';

/**
 * The base implementation of `_.pick` without support for individual
 * property identifiers.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} paths The property paths to pick.
 * @returns {Object} Returns the new object.
 */
function basePick(object, paths) {
  return basePickBy(object, paths, function(value, path) {
    return hasIn(object, path);
  });
}

export { basePick as b };
