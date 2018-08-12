/* @flow */

const global = (1, eval)('this')

export const document = global.document

export const Array = global.Array
export const Date = global.Date
export const Error = global.Error
export const Function = global.Function
export const Object = global.Object
export const Set = global.Set
export const String = global.String

export const ArrayProto = Array.prototype
export const DateProto = Date.prototype
export const ObjectProto = Object.prototype
export const StringProto = String.prototype

export const isFinite = global.isFinite
