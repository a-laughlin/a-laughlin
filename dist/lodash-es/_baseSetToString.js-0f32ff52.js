import { d as defineProperty } from './_defineProperty.js-3ce473e1.js';
import { i as identity } from './identity.js-ddb76187.js';
import { c as constant } from './constant.js-f1c147da.js';

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

export { baseSetToString as b };
