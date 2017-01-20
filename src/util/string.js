
import { String } from './global'
import { idNative } from './type'
import { uncurry } from './function'

const stringProto = String.prototype

const reTrim = /^\s+|\s+$/g

const nativeTrim = idNative(stringProto.trim)

/**
 * chr
 */
export const chr = String.fromCharCode

/**
 * trim
 */
export const trim = nativeTrim
  ? uncurry(trim, 0)
  : string => string.replace(reTrim, '')
