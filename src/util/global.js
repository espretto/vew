
/**
 * because the global scope really is just another module
 */
export const global = (1, eval)('this')

export const JSON = global.JSON
export const Math = global.Math
export const document = global.document
export const location = global.location
export const navigator = global.navigator
export const performance = global.performance
export const localStorage = global.localStorage

export const Array = global.Array
export const Date = global.Date
export const Error = global.Error
export const Number = global.Number
export const Object = global.Object
export const RegExp = global.RegExp
export const Set = global.Set
export const String = global.String

export const parseInt = global.parseInt
export const parseFloat = global.parseFloat
export const setTimeout = global.setTimeout
export const setInterval = global.setInterval
export const setImmediate = global.setImmediate
export const clearTimeout = global.clearTimeout
export const clearInterval = global.clearInterval
export const clearImmediate = global.clearImmediate

