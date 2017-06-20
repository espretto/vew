
import { idNative } from './type'
import { Error, Array } from './global'

/* -----------------------------------------------------------------------------
 * array extras
 *
 * non-conformance
 * - do not skip empty slots
 * - do not support this binding
 * - do not normalize negative offsets (e.g. indexOf)
 * - do not pass original array as third iteree argument
 * - do not support initial value for reduce functions (use fold instead)
 * - do support offsets for find and findIndex
 */

export const toArray = idNative(Array.from) || function (countable) {
  var i = countable.length
    , array = Array(i)

  while (i--) {
    array[i] = countable[i]
  }

  return array
}

export function last (array) {
  return array[array.length-1]
}

export function remove (array, item) {
  var i = indexOf(array, item)
  if (i > -1) removeAt(array, i)
  return i
}

export function removeAt (array, i) {
  var len = array.length - 1

  while (i < len) {
    array[i] = array[++i]
  }

  array.length = len
}

export function insertAt (array, i, item) {
  var len = array.length++

  while (i < len) {
    array[len] = array[--len]
  }

  array[i] = item
}

export function indexOf (array, item, off) {
  var len = array.length
    , i = +off || 0

  for (; i < len; ++i) {
    if (array[i] === item) {
      return i
    }
  }

  return -1
}

export function lastIndexOf (array, item, i) {
  i = (i = +i) === i ? ++i : array.length

  while (i-- > 0) {
    if (array[i] === item) {
      break
    }
  }

  return i
}

/**
 * @return {number} the index at which to insert `item` into `array`
 *   sorted by its items common property `prop`. the value of `prop`
 *   must implement the < operator.
 */
export function sortedIndexFor (array, item, prop) {
  var lo = 0
    , hi = array.length
    , mid
    , val = item[prop]

  while (lo < hi) {
    mid = (lo + hi) >> 1 // Math.floor( (hi+lo) / 2 )
    
    if (array[mid][prop] < val) {
      lo = mid + 1
    }
    else {
      hi = mid
    }
  }

  return hi
}

export function includes (array, item) {
  return indexOf(array, item) !== -1
}

export function forEach (array, func) {
  var len = array.length
    , i = -1

  while (++i < len) {
    if (func(array[i], i) === false) {
      break
    }
  }
}

export function some (array, func) {
  var len = array.length
    , i = -1

  while (++i < len) {
    if (func(array[i], i)) {
      return true
    }
  }

  return false
}

export function every (array, func) {
  var len = array.length
    , i = -1

  while (++i < len) {
    if (!func(array[i], i)) {
      return false
    }
  }

  return true
}

export function map (array, func) {
  var len = array.length
    , i = -1
    , mapped = Array(len)

  while (++i < len) {
    mapped[i] = func(array[i], i)
  }

  return mapped
}

export function mapTo (trg, src, off, func) {
  var len = src.length
    , i = -1

  trg.length = off + len // alloc or free

  while (++i < len) {
    trg[off++] = src[i]
  }

  return trg
}

export function filter (array, func) {
  var len = array.length
    , i = -1
    , item
    , filtered = []
    , f = -1

  while (++i < len) {
    item = array[i]

    if (func(item, i)) {
      filtered[++f] = item
    }
  }

  return filtered
}

export function reduce (array, func) {
  var len = array.length
    , i = 0
    , aggr = array[i]

  if (DEBUG && array.length < 2) {
    throw new Error('reduce of empty array with no initial value')
  }

  while (++i < len) {
    aggr = func(aggr, array[i], i)
  }

  return aggr
}

export function fold (array, aggr, func) {
  var len = array.length
    , i = -1

  while (++i < len) {
    aggr = func(aggr, array[i], i)
  }

  return aggr
}

export function reduceRight (array, func) {
  var i = array.length
    , aggr = array[--i]

  if (DEBUG && array.length < 2) {
    throw new Error('reduce of empty array with no initial value')
  }

  while (i--) {
    aggr = func(array[i], aggr, i)
  }

  return aggr
}

export function foldRight (array, aggr, func) {
  var i = array.length

  while (i--) {
    aggr = func(array[i], aggr, i)
  }

  return aggr
}

export function find (array, func, off) {
  var len = array.length
    , i = +off || 0

  for (; i < len; ++i) {
    if (func(array[i], i)) {
      return array[i]
    }
  }
}

export function findIndex (array, func, off) {
  var len = array.length
    , i = +off || 0

  for (; i < len; ++i) {
    if (func(array[i], i)) {
      return i
    }
  }

  return -1
}

/**
 * zip-style forEach
 */
export function forBoth (array, brray, func) {
  var len = array.length
    , i = -1

  if (DEBUG && len !== brray.length) {
    throw new Error('arrays must be of equal size')
  }

  while (++i < len) {
    if (func(array[i], brray[i], i) === false) {
      break
    }
  }
}

/**
 * mutating version of native Array#concat
 */
export function append (trg, src) {
  var off = trg.length
    , len = src.length
    , i = -1

  trg.length += len // JIT: pre-allocate

  while (++i < len) {
    trg[off+i] = src[i]
  }

  return trg
}

/**
 * flat array equals
 * @param  {array} array
 * @param  {array} brray
 * @return {bool}
 */
export function eqArray (array, brray) {
  return (
    array.length === brray.length &&
    every(array, (value, i) => value === brray[i])
  )
}

export function range (begin, step, end) {
  var result = []
    , i = -1

  if (step === undefined) {
    end = begin
    step = 1
    begin = 0
  }
  else if (end === undefined) {
    end = step
    step = 1
  }

  for (; begin < end; begin += step) {
    result[++i] = begin
  }

  return result
}
