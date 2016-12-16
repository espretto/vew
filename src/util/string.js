
import { idNative } from './type'
import { uncurry } from './function'

const stringProto = String.prototype

/**
 * indexOfUnescaped - find index of first unescaped occurence of `chr`
 * @param  {string} string
 * @param  {string} chr
 * @param  {number} offset
 * @return {number}
 */
export function indexOfUnescaped (string, chr, offset) {
  for (var i; true; offset = i + 1) {
    i = string.indexOf(chr, offset)

    if (i < 1 || string.charAt(i-1) !== '\\') {
      return i
    }
  }
}

/**
 * startsWith - no support for negative offsets
 * @param  {string} string - the input string
 * @param  {string} search - the substring to search for
 * @param  {number} [offset=0] - the index where to start searching - negative values are not supported
 * @return {bool} - whether or not the input `string` starts with `search` at the given `offset`
 */
function startsWithShim (string, search, offset) {
  offset = +offset || 0
  return string.lastIndexOf(search, offset + search.length) === offset
}

const nativeStartsWith = idNative(stringProto.startsWith)

export const startsWith = nativeStartsWith
  ? uncurry(nativeStartsWith, 2)
  : startsWithShim

/**
 * startsWithIgn - case-insensitive version of startsWith
 * @param  {string} string - the input string
 * @param  {string} search - the substring to search for
 * @param  {number} [offset=0] - the index where to start searching - negative values are not supported
 * @return {bool} - whether or not the input `string` starts with `search` at the given `offset`
 */
function startsWithIgn (string, search, offset) {
  return string
    .substr(+offset || 0, search.length)
    .toLowerCase() === search.toLowerCase()
}

/**
 * fromOneCodePoint
 */
const fromCharCode = String.fromCharCode

function customFromCodePoint (codePoint) {
  if (codePoint < 0x10000) {
    return fromCharCode(codePoint)
  }
  else {
    const offset = codePoint - 0x10000
    return fromCharCode(0xD800 + (offset >> 10), 0xDC00 + (offset & 0x3FF))
  }
}

export const fromOneCodePoint = idNative(String.fromCodePoint) || customFromCodePoint



/**
 * partial data-last String#replace
 */
function preplace (regex, callback) {
  return str => str.replace(regex, callback)
}

/**
 * simple hash function:
 * xor two strings according to their character codes (max 4294967295).
 * string `b` will be right-padded to the length of `a` with null characters.
 */
function xor (a, b) {
  var len = a.length
    , i = -1
    , xors = Array(len)

  while (++i < len) {
    xors[i] = a.charCodeAt(i) ^ (b.charCodeAt(i) || 0)
  }

  return fromCharCode.apply(null, xors)
}
