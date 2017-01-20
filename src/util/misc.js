
/**
 * uniqId
 */
var uniqIdCount = 0

export function uniqId (prefix) {
  return prefix + uniqIdCount++
}
