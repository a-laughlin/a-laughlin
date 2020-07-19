import { b as baseCreate } from './_baseCreate.js-1fe7d114.js';
import { g as getPrototype } from './_getPrototype.js-30d5af28.js';
import { i as isPrototype } from './_isPrototype.js-28e760ef.js';

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

export { initCloneObject as i };
