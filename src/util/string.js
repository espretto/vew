/* @flow */

import { isNative } from './type'
import { uncurry } from './function'

/**
 * chr
 */
export const chr = String.fromCharCode

/**
 * startsWith
 */
const nativeStartsWith = String.prototype.startsWith

function customStartsWith (str: string, prefix: string): boolean {
  return str.lastIndexOf(prefix, prefix.length) === 0
}

export const startsWith = isNative(nativeStartsWith)
  ? (uncurry(nativeStartsWith, 1): typeof customStartsWith)
  : customStartsWith

/**
 * trim
 *
 * credits:
 * 	 http://blog.stevenlevithan.com/archives/faster-trim-javascript
 */
const reTrimLeft = /^\s\s*/
const reTrimRight = /\s\s*$/
const nativeTrim = String.prototype.trim

function customTrim (str: string): string {
  return str.replace(reTrimLeft, '').replace(reTrimRight, '')
}

export const trim = isNative(nativeTrim)
  ? (uncurry(nativeTrim, 0): typeof customTrim)
  : customTrim

/**
 * camelize - specialized version for kebab-case
 */
const reCamelCase = /-([a-z])/g

export function camelCase (str: string) {
  return str.replace(reCamelCase, (_, chr) => chr.toUpperCase())
}

/**
 * kebab-case - specialized version for camel-case
 */
const reKebabCase = /[a-z](?=[A-Z])/g

export function kebabCase (str: string) {
  return str.replace(reKebabCase, '$&-').toLowerCase()
}
