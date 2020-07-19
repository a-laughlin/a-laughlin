import { i as identity } from './identity.js-ddb76187.js';
import { o as overRest } from './_overRest.js-96a11039.js';
import { s as setToString } from './_setToString.js-b1e00eb2.js';

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

export { baseRest as b };
