export const objectProto = Object.prototype
export const stringProto = String.prototype
export const arrayProto = Array.prototype
export const dateProto = Date.prototype

type Prototype = 
    typeof objectProto
  | typeof stringProto
  | typeof arrayProto
  | typeof dateProto;

const objectTypes: { [type: string]: boolean } = { 'object': true, 'function': true }

const getTag = objectProto.toString

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
  // cast to allow in-operator
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
 * protof
 */
const nativePrototypeOf = Object.getPrototypeOf
const customPrototypeOf = '__proto__' in objectTypes
  ? (instance: any) => instance.__proto__
  : (instance: any) => instance.constructor.prototype

export const protof: (any: any) => Prototype = isNative(nativePrototypeOf) ? nativePrototypeOf : customPrototypeOf


/**
 * isPlainObject
 */
export function isPlainObject (any: any): boolean {
  return isObject(any) && protof(any) === objectProto
}
