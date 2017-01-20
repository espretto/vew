
import { hasOwn } from './object'
import { isObject, isArray } from './type'

/**
 * has
 */
export function has (object, key) {
  return isObject(object) && (isArray(object)
    ? key < object.length
    : hasOwn.call(object, key)
  )
}

/**
 * toPath
 */
const reUnescapeQuotes = /\\('|")/g

const rePickKeys = /\[('|")((?:\\\1|[^\1])*)\1\]|\[(\d+)|(?:^|\.)([^\.\[]*)/g

export function toPath (str) {
    
  if (isArray(str)) {
    return str
  }
  else if (!str) {
    return []
  }
  else if (str.indexOf('[') < 0) {
    return str.split('.')
  }
  
  var keys = []

  str.replace(rePickKeys, function (match, quote, string, index, key) {
    keys.push(
      quote ? string.replace(reUnescapeQuotes, '$1') :
      index ? +index : key
    )
  })

  return keys
}
