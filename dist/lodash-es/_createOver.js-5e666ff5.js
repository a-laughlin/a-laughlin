import { b as baseUnary } from './_baseUnary.js-6df1a89e.js';
import { a as apply } from './_apply.js-367f18b6.js';
import { b as baseRest } from './_baseRest.js-7e6e80dd.js';
import { a as arrayMap } from './_arrayMap.js-efbe07df.js';
import { b as baseIteratee } from './_baseIteratee.js-718e1a1e.js';
import { f as flatRest } from './_flatRest.js-d229910c.js';

/**
 * Creates a function like `_.over`.
 *
 * @private
 * @param {Function} arrayFunc The function to iterate over iteratees.
 * @returns {Function} Returns the new over function.
 */
function createOver(arrayFunc) {
  return flatRest(function(iteratees) {
    iteratees = arrayMap(iteratees, baseUnary(baseIteratee));
    return baseRest(function(args) {
      var thisArg = this;
      return arrayFunc(iteratees, function(iteratee) {
        return apply(iteratee, thisArg, args);
      });
    });
  });
}

export { createOver as c };
