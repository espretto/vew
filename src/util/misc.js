
/**
 * generate unique id
 * @param  {string} prefix
 * @return {string}
 */
var uniqueIdCounter = 0

export function uniqueId (prefix) {
  return prefix + (uniqueIdCounter++)
}
