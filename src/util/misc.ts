/**
 * uniqId
 */
var uniqIdCount = 0

export function uniqId (prefix: string): string {
  return prefix + uniqIdCount++
}
