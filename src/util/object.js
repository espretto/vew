
import { Object, ObjectProto } from './global'
import { thisify } from './function'
import { idNative } from './type'
import { append, filter, forEach, some } from './array'

const hasEnumBug = !({ valueOf: null }).propertyIsEnumerable('valueOf')

/**
 * hasOwn
 */
export const hasOwn = ObjectProto.hasOwnProperty

/**
 * keys
 */
const brokenKeys = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'.split(',')

function ownKeys (object) {
  var _hasOwn = hasOwn // JIT: lift to loop
    , keys = []
    , i = -1

  for (var key in object) {
    if (_hasOwn.call(object, key)) {
      keys[++i] = key
    }
  }

  return keys
}

function safeKeys (object) {
  return append(ownKeys(object), filter(brokenKeys, thisify(hasOwn, object, 1)))
}

export const keys = idNative(Object.keys) || (hasEnumBug ? safeKeys : ownKeys)

/**
 * isEmptyObject
 */
function isOwnEmptyObject (object) {
  const _hasOwn = hasOwn

  for (var key in object) {
    if (_hasOwn.call(object, key)) {
      return false
    }
  }
  
  return true
}

function isSafeEmptyObject (object) {
  return isOwnEmptyObject(object) && !some(brokenKeys, thisify(hasOwn, object, 1))
}

export const isEmptyObject = hasEnumBug ? isSafeEmptyObject : isOwnEmptyObject

/**
 * getOwn
 */
export function getOwn (object, key, alt) {
  return hasOwn.call(object, key) ? object[key] : alt
}

/**
 * forOwn
 */
export function forOwn (object, func) {
  forEach(keys(object), key => func(object[key], key))
}

/**
 * extend
 */
export const extend = idNative(Object.assign) || function (trg, src) {
  if (src != null) forEach(keys(src), key => { trg[key] = src[key] })
  return trg
}

/**
 * create
 */
function Null () {}

export const create = idNative(Object.create) || function (proto) {
  Null.prototype = proto
  const instance = new Null()
  Null.prototype = null
  
  return instance
}

/**
 * deleteValue
 */
export function deleteValue (object, value) {
  return some(keys(object), key => object[key] === value && delete object[key])
}
