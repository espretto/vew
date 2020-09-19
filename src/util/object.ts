import { isNative } from './type'
import { append, filter, forEach, some } from './array'

const hasEnumBug = !({ valueOf: null }).propertyIsEnumerable('valueOf')

const hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * hasOwn
 */
export function hasOwn (obj: object, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * keys
 */
const nativeKeys = Object.keys

const brokenKeys = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'.split(',')

function ownKeys (obj: object) {
  const hasOwn = hasOwnProperty // JIT: lift to scope
  const keys: string[] = []
  let i = -1

  for (let key in obj) {
    if (hasOwn.call(obj, key)) {
      keys[++i] = key
    }
  }

  return keys
}

function safeKeys (obj: object) {
  return append(ownKeys(obj), filter(brokenKeys, key => hasOwnProperty.call(obj, key)))
}

export const keys: typeof nativeKeys = isNative(nativeKeys)
  ? nativeKeys
  : hasEnumBug
    ? safeKeys
    : ownKeys

/**
 * isEmptyObject
 */
function isOwnEmptyObject (obj: object) {
  const hasOwn = hasOwnProperty // JIT: lift to scope

  for (let key in obj) {
    if (hasOwn.call(obj, key)) {
      return false
    }
  }
  
  return true
}

function isSafeEmptyObject (obj: object) {
  return isOwnEmptyObject(obj) && !some(brokenKeys, key => hasOwnProperty.call(obj))
}

export const isEmptyObject = hasEnumBug ? isSafeEmptyObject : isOwnEmptyObject

/**
 * getOwn
 */
export function getOwn <T, U extends keyof T> (obj: T, key: U, alt: T[U]): T[U] {
  return hasOwnProperty.call(obj, key) ? obj[key] : alt
}

/**
 * forOwn
 */
export function forOwn <T> (obj: { [key: string]: T }, func: (item: T, key: string) => boolean | void) {
  forEach(keys(obj), key => func(obj[key], key))
}

/**
 * mapOwn 
 */
export function mapOwn <T, U> (obj: { [key: string]: T }, mapper: (item: T, key: string) => U) {
  const mapped: { [key: string]: U } = {}
  forOwn(obj, (value, key) => {
    mapped[key] = mapper(value, key)
  })
  return mapped
}

/**
 * iterator factory for performance critical iteration of key-fixed objects
 */
export function iterator (obj: object) {
  const _keys = keys(obj)
  const _len = _keys.length
  
  return (obj: object, func: (item: any, key: string) => boolean) => {
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

function customExtend (trg: object, src: {}) {
  forOwn(src, (val, key) => { trg[key] = val })
  return trg
}

export const extend = (isNative(nativeAssign) ? nativeAssign : customExtend) as <T, U>(src: T, trg: U) => T & U;

/**
 * create
 */
const nativeCreate = Object.create

function Null () {}

function customCreate (proto: object | null) {
  Null.prototype = proto
  const instance = new Null()
  Null.prototype = null
  return instance
}

export const create = isNative(nativeCreate) ? nativeCreate : customCreate

/**
 * deleteValue
 */
export function deleteValue <T> (obj: T, val: T[keyof T]) {
  for (let key in obj) {
    if (obj[key] === val) {
      return delete obj[key]
    }
  }
  return false
}
