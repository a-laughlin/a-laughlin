import { b as baseSetToString } from './_baseSetToString.js-0f32ff52.js';
import { s as shortOut } from './_shortOut.js-db5b33fd.js';

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

export { setToString as s };
