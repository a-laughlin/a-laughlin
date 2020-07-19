import { b as baseUnary } from './_baseUnary.js-6df1a89e.js';
import { i as identity } from './identity.js-ddb76187.js';
import { a as arrayMap } from './_arrayMap.js-efbe07df.js';
import { b as baseIteratee } from './_baseIteratee.js-718e1a1e.js';
import { b as baseMap } from './_baseMap.js-781eedcf.js';
import { b as baseSortBy } from './_baseSortBy.js-2eea9fb7.js';
import { c as compareMultiple } from './_compareMultiple.js-4ef115e3.js';

/**
 * The base implementation of `_.orderBy` without param guards.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
 * @param {string[]} orders The sort orders of `iteratees`.
 * @returns {Array} Returns the new sorted array.
 */
function baseOrderBy(collection, iteratees, orders) {
  var index = -1;
  iteratees = arrayMap(iteratees.length ? iteratees : [identity], baseUnary(baseIteratee));

  var result = baseMap(collection, function(value, key, collection) {
    var criteria = arrayMap(iteratees, function(iteratee) {
      return iteratee(value);
    });
    return { 'criteria': criteria, 'index': ++index, 'value': value };
  });

  return baseSortBy(result, function(object, other) {
    return compareMultiple(object, other, orders);
  });
}

export { baseOrderBy as b };
