
import { String, StringProto } from './global'
import { idNative } from './type'
import { uncurry } from './function'


const reTrimLeft = /^\s\s*/

const reTrimRight = /\s\s*$/;

const nativeTrim = idNative(StringProto.trim)

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
