import { l as listCacheClear } from './_listCacheClear.js-e2c31d6d.js';
import { l as listCacheDelete } from './_listCacheDelete.js-73448065.js';
import { l as listCacheGet } from './_listCacheGet.js-ab0a3256.js';
import { l as listCacheHas } from './_listCacheHas.js-3166b85c.js';
import { l as listCacheSet } from './_listCacheSet.js-de9e7743.js';

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

export { ListCache as L };
