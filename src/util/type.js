
import { Array, Object } from './global'

const objectTypes = { 'object': true, 'function': true }

const objectProto = Object.prototype

const toString = objectProto.toString

const protoProp = '__proto__'

const arrayTag = '[object Array]'

const dateTag = '[object Date]'

const funcTag = '[object Function]'

/**
 * isObject
 */
export function isObject (any) {
  return any != null && objectTypes[typeof any]
}

/**
 * isString
 */
export function isString (any) {
  return typeof any === 'string'
}

/**
 * isNumeric
 */
export function isNumeric (any) {
  return +any === +any
}

/**
 * isUndefined
 */
export function isUndefined (any) {
  return any === void 0
}

/**
 * isFunction
 */
function isFunc (any) {
  return typeof any === 'function'
}

export const isFunction = isFunc(/re/)
  ? any => isFunc(any) && toString.call(any) === funcTag
  : isFunc

/**
 * idNative
 */
export function idNative (any) {
  if (isFunction(any) && !('prototype' in any)) {
    return any
  }
}

/**
 * isArray
 */
export const isArray = idNative(Array.isArray) || (any =>
  isObject(any) && toString.call(any) === arrayTag
)

/**
 * isDate
 */
export function isDate (any) {
  return isObject(any) && toString.call(any) === dateTag
}

/**
 * isPlainObject
 */
const protoOf = idNative(Object.getPrototypeOf) || (protoProp in objectTypes
  ? any => any[protoProp]
  : any => any.constructor.prototype
)

export function isPlainObject (any) {
  return isObject(any) && protoOf(any) === objectProto
}
