import { b as baseIsMatch } from './_baseIsMatch.js-fe8d464f.js';
import { g as getMatchData } from './_getMatchData.js-8a722ba0.js';
import { m as matchesStrictComparable } from './_matchesStrictComparable.js-d19af892.js';

/**
 * The base implementation of `_.matches` which doesn't clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || baseIsMatch(object, source, matchData);
  };
}

export { baseMatches as b };
