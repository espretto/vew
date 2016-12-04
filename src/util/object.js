
import { Object } from './global'
import { thisify } from './function'
import { idNative } from './type'
import { append, filter, forEach, some } from './array'

/**
 * hasOwn
 * @this {object}
 * @param {key} key
 * @return {bool}
 */
export const hasOwn = Object.prototype.hasOwnProperty

/**
 * keys
 * @param  {*}
 * @return {array}
 */
const hasEnumBug = !({ valueOf: null }).propertyIsEnumerable('valueOf')

const brokenKeys =
[ 'constructor'
, 'hasOwnProperty'
, 'isPrototypeOf'
, 'propertyIsEnumerable'
, 'toLocaleString'
, 'toString'
, 'valueOf'
]

function ownKeys (object) {
  var hasOwnLocal = hasOwn // JIT: lift to loop
    , keys = []
    , i = -1

  for (var key in object) {
    if (hasOwnLocal.call(object, key)) {
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
 * @param  {object}
 * @return {bool}
 */
function hasNoOwnKeys (object) {
  var hasOwnLocal = hasOwn // JIT: lift to loop

  for (var key in object) {
    if (hasOwnLocal.call(object, key)) {
      return false
    }
  }
  
  return true
}

function hasNoSafeKeys (object) {
  return hasNoOwnKeys(object) && !some(brokenKeys, thisify(hasOwn, object, 1))
}

export const isEmptyObject = hasEnumBug ? hasNoSafeKeys : hasNoOwnKeys

export function getOwn (object, key, alt) {
  return hasOwn.call(object, key) ? object[key] : alt
}

/**
 * forOwn
 * @param  {object} object
 * @param  {function} func
 */
export function forOwn (object, func) {
  forEach(keys(object), key => func(object[key], key))
}

/**
 * extend
 * @param  {object} trg
 * @param  {object} src
 * @return {object}
 */
const nativeAssign = idNative(Object.assign)

export const extend = nativeAssign || function (trg, src) {
  
  if (src != null) {
    forEach(keys(src), key => { trg[key] = src[key] })
  }

  return trg
}

/**
 * assign
 * @param  {object} trg
 * @param  {...object} src
 * @return {object}
 */
export const assign = nativeAssign || function (trg) {
  var len = arguments.length
    , i = 0

  while (++i < len) {
    extend(trg, arguments[i])
  }

  return trg
}

/**
 * create
 * @param {object} proto the instances prototype
 * @return {object} a `new`ly created object with the given prototype
 */
export const create = idNative(Object.create) || function (proto) {

  Null.prototype = proto
  var instance = new Null()
  Null.prototype = null

  return instance
}

function Null () {}

/**
 * @param  {object} object
 * @param  {*} prop 
 * @return {string|undefined} the own property's key on the object
 */
export function findKey (object, prop) {
  for (var key in object) {
    if (hasOwn.call(object, key) && object[key] === prop) {
      return key
    }
  }
}

/**
 * remove the own property from its parent
 * @param  {object} object
 * @param  {*} prop
 */
export function del (object, prop) {
  var key = findKey(object, prop)

  if (key !== undefined) {
    delete object[key]
  }
}