/* @flow */

import { thisify } from './function'
import { isNative } from './type'
import { append, filter, forEach, some } from './array'

const hasEnumBug = !({ valueOf: null }).propertyIsEnumerable('valueOf')

/**
 * hasOwn
 */
export const hasOwn = Object.prototype.hasOwnProperty

/**
 * keys
 */
const nativeKeys = Object.keys

const brokenKeys = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'.split(',')

function ownKeys (obj: Object) {
  var _hasOwn = hasOwn // JIT: lift to scope
    , keys = []
    , i = -1

  for (var key in obj) {
    if (_hasOwn.call(obj, key)) {
      keys[++i] = key
    }
  }

  return keys
}

function safeKeys (obj: Object) {
  return append(ownKeys(obj), filter(brokenKeys, thisify(hasOwn, obj, 1)))
}

export const keys: typeof nativeKeys = isNative(nativeKeys)
  ? nativeKeys
  : hasEnumBug
    ? safeKeys
    : ownKeys

/**
 * isEmptyObject
 */
function isOwnEmptyObject (obj: Object) {
  const _hasOwn = hasOwn // JIT: lift to scope

  for (var key in obj) {
    if (_hasOwn.call(obj, key)) {
      return false
    }
  }
  
  return true
}

function isSafeEmptyObject (obj: Object) {
  return isOwnEmptyObject(obj) && !some(brokenKeys, thisify(hasOwn, obj, 1))
}

export const isEmptyObject = hasEnumBug ? isSafeEmptyObject : isOwnEmptyObject

/**
 * getOwn
 */
export function getOwn <T, U, V: { [key: U]: T }> (obj: V, key: U, alt: T): T {
  return hasOwn.call(obj, key) ? obj[key] : alt
}

/**
 * forOwn
 */
export function forOwn <T, U: {[key: string]: T}> (obj: U, func: (T, string) => ?boolean) {
  forEach(keys(obj), key => func(obj[key], key))
}

/**
 * mapOwn 
 */
export function mapOwn <T, U: { key: T }, V> (obj: U, mapper: (T, string) => V): { key: V } {
  var mapped = {}
  forOwn(obj, (value, key) => {
    mapped[key] = mapper(value, key)
  })
  return mapped
}

/**
 * iterator factory for performance critical iteration of key-fixed objects
 */
export function iterator (obj: Object) {
  const _keys = keys(obj)
  const _len = _keys.length
  
  return (obj: Object, func: (mixed, string) => ?boolean) => {
    const __keys = _keys // JIT: lift to scope
    const __len = _len // JIT: lift to scope
    
    for (let key, i = -1; ++i < __len;) {
      key = __keys[i]
      if (func(obj[key], key) === false) {
        break
      }
    }
  }
}

/**
 * extend
 */
const nativeAssign = Object.assign

function customExtend (trg: Object, src: Object) {
  forOwn(src, (val, key) => { trg[key] = val })
  return trg
}

export const extend = isNative(nativeAssign) ? nativeAssign : customExtend

/**
 * create
 */
const nativeCreate = Object.create

function Null () {}

function customCreate (proto: Object|null) {
  Null.prototype = proto
  const instance = new Null()
  Null.prototype = null
  return instance
}

export const create = isNative(nativeCreate) ? nativeCreate : customCreate

/**
 * deleteValue
 */
export function deleteValue <T, U: { [key: string|number]: T }> (obj: U, val: T) {
  for (let key in obj) {
    if (obj[key] === val) {
      return delete obj[key]
    }
  }
  return false
}
