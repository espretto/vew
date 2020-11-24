
const objectTypes: { [type: string]: boolean } = { 'object': true, 'function': true }

export const getTag = Object.prototype.toString

const arrayTag = '[object Array]'

const dateTag = '[object Date]'

const funcTag = '[object Function]'

/**
 * isObject
 */
export function isObject (any: any): any is object {
  return any != null && objectTypes[typeof any]
}

/**
 * isString
 */
export function isString (any: any): any is string {
  return typeof any === 'string'
}

/**
 * isUndefined
 */
export function isUndefined (any: any): any is void {
  return any === void 0
}

/**
 * isFunction
 */
function nativeIsFunction (any: any): any is Function {
  return typeof any === 'function'
}

function customIsFunction (any: any): any is Function {
  return nativeIsFunction(any) && getTag.call(any) === funcTag
}

export const isFunction = nativeIsFunction(/re/) ? customIsFunction : nativeIsFunction

/**
 * idNative
 */
export function isNative (func: Function): boolean {
  return isFunction(func) && !('prototype' in func)
}

/**
 * isArray
 */
const nativeIsArray = Array.isArray

function customIsArray (obj: any): obj is Array<unknown> {
  return isObject(obj) && getTag.call(obj) === arrayTag
}

export const isArray = isNative(nativeIsArray) ? nativeIsArray : customIsArray

/**
 * isDate
 */
export function isDate (any: any): any is Date {
  return isObject(any) && getTag.call(any) === dateTag
}

/**
 * getPrototypeOf
 */
const nativePrototypeOf = Object.getPrototypeOf
const customPrototypeOf = '__proto__' in objectTypes
  ? (instance: any) => instance.__proto__
  : (instance: any) => instance.constructor.prototype

export const getPrototypeOf: typeof nativePrototypeOf = isNative(nativePrototypeOf) ? nativePrototypeOf : customPrototypeOf
