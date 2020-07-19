import { g as getNative } from './_getNative.js-6ce67c8b.js';

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

export { defineProperty as d };
