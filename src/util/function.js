
export function id (any) {
  return any
}

/**
 * custom *Function#bind*
 */
export function thisify (func, that, arity) {
  switch (+arity === arity ? arity : func.length) {
    case 0: return () => func.call(that)
    case 1: return (a) => func.call(that, a)
    case 2: return (a, b) => func.call(that, a, b)
    default: return function () { return func.apply(that, arguments) }
  }
}

/**
 * uncurry instance methods to receive `this` as first argument
 */
export function uncurry (func, arity) {
  switch (+arity === arity ? arity : func.length) {
    case 0: return (that) => func.call(that)
    case 1: return (that, a) => func.call(that, a)
    case 2: return (that, a, b) => func.call(that, a, b)
    default: return function () { return func.call.apply(func, arguments) }
  }
}
