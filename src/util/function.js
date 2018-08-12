/* @flow */

export function id <T> (any: T): T {
  return any
}

/**
 * custom *Function#bind*
 */
export function thisify (func: Function, that: mixed, arity: number)  {
  switch (arity) {
    case 0: return () => func.call(that)
    case 1: return (a: any) => func.call(that, a)
    case 2: return (a: any, b: any) => func.call(that, a, b)
    // flowignore: arguments
    default: return function () { return func.apply(that, arguments) }
  }
}

/**
 * uncurry instance methods to receive `this` as first argument
 */
export function uncurry (func: Function, arity: number) {
  switch (arity) {
    case 0: return (that: any) => func.call(that)
    case 1: return (that: any, a: any) => func.call(that, a)
    case 2: return (that: any, a: any, b: any) => func.call(that, a, b)
    // flowignore: arguments 
    default: return function () { return func.call.apply(func, arguments) }
  }
}
