import { h as hashClear } from './_hashClear.js-6690e721.js';
import { h as hashDelete } from './_hashDelete.js-5fa65fee.js';
import { h as hashGet } from './_hashGet.js-73445d8e.js';
import { h as hashHas } from './_hashHas.js-896bca19.js';
import { h as hashSet } from './_hashSet.js-7b0463bb.js';

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

export { Hash as H };
