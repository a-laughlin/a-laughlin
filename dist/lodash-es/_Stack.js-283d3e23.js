import { L as ListCache } from './_ListCache.js-31797373.js';
import { s as stackClear } from './_stackClear.js-583ff074.js';
import { s as stackDelete } from './_stackDelete.js-51c69537.js';
import { s as stackGet } from './_stackGet.js-4846d0cd.js';
import { s as stackHas } from './_stackHas.js-65485a5c.js';
import { s as stackSet } from './_stackSet.js-565499c9.js';

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

export { Stack as S };
