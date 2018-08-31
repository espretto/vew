/* @flow */

export const objectProto = Object.prototype
export const stringProto = String.prototype
// flowignore
export const arrayProto = Array.prototype
export const dateProto = Date.prototype

type Prototype = 
    typeof objectProto
  | typeof stringProto
  | typeof arrayProto
  | typeof dateProto

const objectTypes: { [type: string]: boolean } = { 'object': true, 'function': true }

const getTag = objectProto.toString

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
function nativeIsFunction (any: mixed): boolean %checks {
  return typeof any === 'function'
}

function customIsFunction (any: mixed): boolean %checks {
  return nativeIsFunction(any) && getTag.call(any) === funcTag
}

export const isFunction = nativeIsFunction(/re/) ? customIsFunction : nativeIsFunction

/**
 * idNative
 */
export function isNative (func: Function): boolean %checks {
  // cast to allow in-operator
  return isFunction(func) && !('prototype' in (func: Object))
}

/**
 * isArray
 */
const nativeIsArray = Array.isArray

function customIsArray (obj: mixed): boolean %checks {
  return isObject(obj) && getTag.call(obj) === arrayTag
}

export const isArray = isNative(nativeIsArray) ? nativeIsArray : customIsArray

/**
 * isDate
 */
export function isDate (any: mixed): boolean %checks {
  return isObject(any) && getTag.call(any) === dateTag
}

/**
 * protof
 */
const nativePrototypeOf = Object.getPrototypeOf
const customPrototypeOf = '__proto__' in objectTypes
  ? instance => (instance: any).__proto__
  : instance => (instance: any).constructor.prototype

export const protof: mixed => Prototype = isNative(nativePrototypeOf) ? nativePrototypeOf : customPrototypeOf


/**
 * isPlainObject
 */
export function isPlainObject (any: any): boolean %checks {
  return isObject(any) && protof(any) === objectProto
}
