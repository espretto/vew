
import { Array, Date, Number, Object, RegExp, Set, String } from './global'

const objectProto = Object.prototype

const toString = objectProto.toString

/**
 * isObject
 * @param  {*}
 * @return {bool}
 */
const objectTypes = { 'object': true, 'function': true }

export function isObject (any) {
  return any != null && objectTypes[typeof any]
}

/**
 * isFunction
 * @param  {*}
 * @return {bool}
 */
const funcTag = '[object Function]'

function isTypeFunction (any) {
  return typeof any === 'function'
}

export const isFunction = isTypeFunction(/r/)
  ? any => isTypeFunction(any) && toString.call(any) === funcTag
  : isTypeFunction

/**
 * idNative
 * @param  {function}
 * @return {function}
 */
export function idNative (any) {
  return !isFunction(any) || 'prototype' in any ? false : any
}

/**
 * protoOf
 * @param  {*} any
 * @return {object} prototype of any
 */
export const protoOf = idNative(Object.getPrototypeOf) || ('__proto__' in objectTypes
  ? any => any.__proto__
  : any => any.constructor.prototype
)

/**
 * isPlainObject
 * @param  {*}
 * @param  {bool}
 * @return {bool}
 */
export function isPlainObject (any, isObj) {
  return (isObj || isObject(any)) && protoOf(any) === objectProto
}

/**
 * isArray
 * @param  {*}  any
 * @param  {bool} isObj
 * @return {bool}
 */
const arrayTag = '[object Array]'

function isArrayShim (any, isObj) {
  return (isObj || isObject(any)) && toString.call(any) === arrayTag
}

export const isArray = idNative(Array.isArray) || isArrayShim

/**
 * isDate
 * @param  {*}
 * @param  {bool}
 * @return {bool}
 */
const dateTag = '[object Date]'

export function isDate (any, isObj) {
  return (isObj || isObject(any)) && toString.call(any) === dateTag
}

/**
 * isUndefined
 * @param  {*}
 * @return {bool}
 */
export function isUndefined (any) {
  return any === void 0
}

/**
 * isString
 * @param  {*}
 * @param  {bool}
 * @return {bool}
 */
export function isString (any) {
  return typeof any === 'string'
}
