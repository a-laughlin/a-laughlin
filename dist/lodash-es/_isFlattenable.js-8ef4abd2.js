import { S as Symbol } from './_Symbol.js-09c49294.js';
import { i as isArguments } from './isArguments.js-49778255.js';
import { i as isArray } from './isArray.js-348c388d.js';

/** Built-in value references. */
var spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

export { isFlattenable as i };
