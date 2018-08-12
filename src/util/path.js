/* @flow */

import { hasOwn } from './object'
import { isObject, isString } from './type'

export type Path = string[]

/**
 * has
 */
export function has (object: any, key: string): boolean {
  return isObject(object) && (Array.isArray(object)
    ? key < object.length
    : hasOwn.call(object, key)
  )
}

/**
 * toPath
 */
const reUnescapeQuotes = /\\('|")/g

const reCaptureKeys = /\[('|")((?:\\\1|[^\1])*)\1\]|\[(\d+)|(?:^|\.)([^\.\[]*)/g

export function toPath (path: string|Path): Path {
  
  if (!isString(path)) {
    return path
  }
  if (!path) {
    return []
  }
  else if (path.indexOf('[') < 0) {
    return path.split('.')
  }
  
  var keys = []

  path.replace(reCaptureKeys, function (match, quote: string, quoted: string, index: string, key: string) {
    keys.push(
      quote ? quoted.replace(reUnescapeQuotes, '$1') :
      index ? index : key
    )

    return ''
  })

  return keys
}
