import { M as MapCache } from './_MapCache.js-0e911fa6.js';
import { s as setCacheAdd } from './_setCacheAdd.js-6cf11f54.js';
import { s as setCacheHas } from './_setCacheHas.js-077b149c.js';

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

export { SetCache as S };
