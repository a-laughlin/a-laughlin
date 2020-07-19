import { o as overRest } from './_overRest.js-96a11039.js';
import { s as setToString } from './_setToString.js-b1e00eb2.js';
import { f as flatten } from './flatten.js-06038df6.js';

/**
 * A specialized version of `baseRest` which flattens the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @returns {Function} Returns the new function.
 */
function flatRest(func) {
  return setToString(overRest(func, undefined, flatten), func + '');
}

export { flatRest as f };
