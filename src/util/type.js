
import { Array, Object } from './global'

const objectProto = Object.prototype

const toString = objectProto.toString

const dateTag = '[object Date]'

const funcTag = '[object Function]'

const arrayTag = '[object Array]'

const protoProp = '__proto__'

const objectTypes = { 'object': true, 'function': true }

function isFunc (any) {
  return typeof any === 'function'
}

/* -----------------------------------------------------------------------------
 * type checking
 */
export function isObject (any) {
  return any != null && objectTypes[typeof any]
}

export function isString (any) {
  return typeof any === 'string'
}

export function isUndefined (any) {
  return any === void 0
}

export const isFunction = isFunc(/re/)
  ? any => isFunc(any) && toString.call(any) === funcTag
  : isFunc

export function idNative (any) {
  if (isFunction(any) && !('prototype' in any)) {
    return any
  }
}

export const isArray = idNative(Array.isArray) || (any =>
  isObject(any) && toString.call(any) === arrayTag
)

export function isDate (any) {
  return isObject(any) && toString.call(any) === dateTag
}

const protoOf = idNative(Object.getPrototypeOf) || (protoProp in objectTypes
  ? any => any[protoProp]
  : any => any.constructor.prototype
)

export function isPlainObject (any) {
  return isObject(any) && protoOf(any) === objectProto
}