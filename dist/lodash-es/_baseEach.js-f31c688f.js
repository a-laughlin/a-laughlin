import { b as baseForOwn } from './_baseForOwn.js-f2105544.js';
import { c as createBaseEach } from './_createBaseEach.js-2bcc6476.js';

/**
 * The base implementation of `_.forEach` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

export { baseEach as b };
