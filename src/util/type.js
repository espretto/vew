/* @flow */

const objectTypes: { [type: string]: boolean } = { 'object': true, 'function': true }

const getTag = Object.prototype.toString

const arrayTag = '[object Array]'

const dateTag = '[object Date]'

const funcTag = '[object Function]'

/**
 * isObject
 */
export function isObject (any: mixed): %checks {
  return any != null && objectTypes[typeof any]
}

/**
 * isString
 */
export function isString (any: mixed): %checks {
  return typeof any === 'string'
}

/**
 * isUndefined
 */
export function isUndefined (any: mixed): %checks {
  return any === void 0
}

/**
 * isFunction
 */
function nativeIsFunction (any: mixed): %checks {
  return typeof any === 'function'
}

function customIsFunction (any: mixed): %checks {
  return nativeIsFunction(any) && getTag.call(any) === funcTag
}

export const isFunction = nativeIsFunction(/re/) ? customIsFunction : nativeIsFunction

/**
 * idNative
 */
export function isNative (func: Function): %checks {
  // flowignore: in-operator only alllowed on object|array
  return isFunction(func) && !('prototype' in func)
}

/**
 * isArray
 */
const nativeIsArray = Array.isArray

function customIsArray (obj: any): boolean %checks {
  return isObject(obj) && getTag.call(obj) === arrayTag
}

export const isArray = nativeIsArray
// isNative(nativeIsArray)
//   ? nativeIsArray
//   // flowignore: hide customIsArray type
//   : customIsArray

/**
 * isDate
 */
export function isDate (any: mixed): %checks {
  return isObject(any) && getTag.call(any) === dateTag
}

/**
 * protof
 */
const nativePrototypeOf = Object.getPrototypeOf
const customPrototypeOf: Object => {} = '__proto__' in objectTypes
  ? instance => instance.__proto__
  : instance => instance.constructor.prototype

export const protof = isNative(nativePrototypeOf) ? nativePrototypeOf : customPrototypeOf

/**
 * isPlainObject
 */
const objectProto = protof({})

export function isPlainObject (any: any): boolean %checks {
  return isObject(any) && protof(any) === objectProto
}
