import { m as mapCacheClear } from './_mapCacheClear.js-10156fde.js';
import { m as mapCacheDelete } from './_mapCacheDelete.js-01a46502.js';
import { m as mapCacheGet } from './_mapCacheGet.js-42005c75.js';
import { m as mapCacheHas } from './_mapCacheHas.js-0989f7fc.js';
import { m as mapCacheSet } from './_mapCacheSet.js-15b69a11.js';

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

export { MapCache as M };
