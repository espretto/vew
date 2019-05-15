/* @flow */

import { hasOwn } from './object'
import { isObject, isString } from './type'

export type KeyPath = string[]

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
 * toKeyPath
 */
const reUnescapeQuotes = /\\('|")/g

const reCaptureKeys = /\[('|")((?:\\\1|[^\1])*)\1\]|\[(\d+)|(?:^|\.)([^\.\[]*)/g

export function toKeyPath (path: string): KeyPath {
  if (!path) return []
  if (path.indexOf('[') < 0) return path.split('.')

  const keys = []

  path.replace(reCaptureKeys, function (match, quote, quoted, index, key) {
    keys.push(
      quote ? quoted.replace(reUnescapeQuotes, '$1') :
      index ? index : key
    )

    return ''
  })

  return keys
}
