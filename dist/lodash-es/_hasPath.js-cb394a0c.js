import { i as isArguments } from './isArguments.js-49778255.js';
import { i as isArray } from './isArray.js-348c388d.js';
import { i as isLength } from './isLength.js-0b7b9fd1.js';
import { i as isIndex } from './_isIndex.js-75de89e7.js';
import { c as castPath } from './_castPath.js-23467a97.js';
import { t as toKey } from './_toKey.js-00bd10e9.js';

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = castPath(path, object);

  var index = -1,
      length = path.length,
      result = false;

  while (++index < length) {
    var key = toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength(length) && isIndex(key, length) &&
    (isArray(object) || isArguments(object));
}

export { hasPath as h };
