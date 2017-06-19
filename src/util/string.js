
import { String, StringProto } from './global'
import { idNative } from './type'
import { uncurry } from './function'

const reIsNotEmpty = /\S/

const reTrimLeft = /^\s\s*/

const reTrimRight = /\s\s*$/;

const nativeTrim = idNative(StringProto.trim)

const nativeStartsWith = idNative(StringProto.startsWith)

/**
 * chr
 */
export const chr = String.fromCharCode

/**
 * startsWith
 */
export const startsWith = nativeStartsWith
  ? uncurry(nativeStartsWith, 1)
  : (string, prefix) => string.lastIndexOf(prefix, prefix.length) === 0

/**
 * trim
 *
 * credits:
 * 	 http://blog.stevenlevithan.com/archives/faster-trim-javascript
 */
export const trim = nativeTrim
  ? uncurry(nativeTrim, 0)
  : string => string.replace(reTrimLeft, '')
                    .replace(reTrimRight, '')

/**
 * isEmpty
 */
export function isEmpty (string) {
  return !reIsNotEmpty.test(string)
}

/**
 * camelize - specialized version for kebab-case
 */
const reCamelCase = /-([a-z])/g

export function camelCase (string) {
  return string.replace(reCamelCase, (_, chr) => chr.toUpperCase())
}

/**
 * kebab-case - specialized version for camel-case
 */
const reKebabCase = /[a-z](?=[A-Z])/g

export function kebabCase (string) {
  return string.replace(reKebabCase, '$&-').toLowerCase()
}
