import { L as ListCache } from './_ListCache.js-31797373.js';
import { M as Map } from './_Map.js-26262f48.js';
import { H as Hash } from './_Hash.js-f6717b1a.js';

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

export { mapCacheClear as m };
