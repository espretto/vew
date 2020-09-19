export type KeyPath = string[];

/** used to remove leading backslashes */
const reUnescapeQuotes = /\\('|")/g

/** used to capture segments of a keypath */
const reCaptureKeys = /\[('|")((?:\\\1|[^\1])*)\1\]|\[(\d+)|(?:^|\.)([^\.\[]*)/g

export function toKeyPath (path: string): KeyPath {
  if (!path) return []
  if (path.indexOf('[') < 0) return path.split('.')

  const keyPath: KeyPath = []

  path.replace(reCaptureKeys, function (match, quote, quoted, index, key) {
    keyPath.push(
      quote ? quoted.replace(reUnescapeQuotes, '$1') :
      index ? index : key
    )

    return '' // JIT: monomorphism
  })

  return keyPath
}
