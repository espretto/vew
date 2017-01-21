
import { String } from './global'
import { idNative } from './type'
import { uncurry } from './function'

const stringProto = String.prototype

const reTrimLeft = /^\s\s*/

const reTrimRight = /\s\s*$/;

const nativeTrim = idNative(stringProto.trim)

/**
 * chr
 */
export const chr = String.fromCharCode

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
