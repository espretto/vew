import { isNative, isUndefined } from './type'
import { deleteValue } from './object';

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

const nativeFrom = Array.from

function customFrom <T> (countable: ArrayLike<T>): Array<T> {
  const len = countable.length
  const array = new Array<T>(len)
  let i = -1

  while (++i < len) {
    array[i] = countable[i]
  }

  return array
}

export const toArray = isNative(nativeFrom) ? nativeFrom : customFrom

export function last <T> (array: ArrayLike<T>): T {
  return array[array.length-1]
}

export function remove <T> (array: T[], item: T): number {
  const i = indexOf(array, item)
  if (i > -1) removeAt(array, i)
  return i
}

export function removeAt (array: any[], i: number): void {
  const len = array.length - 1

  while (i < len) {
    array[i] = array[++i]
  }

  array.length = len
}

export function insertAt <T> (array: T[], i: number, item: T): void {
  let len = array.length++

  while (i < len) {
    array[len] = array[--len]
  }

  array[i] = item
}

export function indexOf <T> (array: ArrayLike<T>, item: T, offset: number = 0): number {
  const len = array.length
  let i = offset

  for (; i < len; ++i) {
    if (array[i] === item) {
      return i
    }
  }

  return -1
}

export function lastIndexOf <T> (array: ArrayLike<T>, item: T, i: number = array.length-1): number {
  for (;i > -1; i--) {
    if (array[i] === item) {
      break
    }
  }

  return i
}

/**
 * @return {number} the lowest index in `array` at which to insert `item`
 *                  ranked by the `key` function
 */
type Comparable = string | number;

export function sortedIndexBy <T> (array: ArrayLike<T>, item: T, key: (item: T) => Comparable): number {
  let lo = 0
  let hi = array.length
  const search = key(item)
  let value


  while (lo < hi) {
    let mid = (lo + hi) >> 1 // Math.floor( (hi+lo) / 2 )
    value = key(array[mid])

    // flowignore: search and value are both either string or number
    if (search < value) {
      lo = mid + 1
    }
    else {
      hi = mid
    }
  }

  return search === value ? hi : ~hi
}

export function includes <T> (array: ArrayLike<T>, item: T): boolean {
  return indexOf(array, item) !== -1
}

export function forEach <T> (array: ArrayLike<T>, func: (item: T, index: number) => boolean | void): void {
  const len = array.length
  let i = -1

  while (++i < len) {
    if (func(array[i], i) === false) {
      break
    }
  }
}

export function some <T> (array: ArrayLike<T>, func: (item: T, index: number) => boolean): boolean {
  const len = array.length
  let i = -1

  while (++i < len) {
    if (func(array[i], i)) {
      return true
    }
  }

  return false
}

export function every <T> (array: ArrayLike<T>, func: (item: T, index: number) => boolean): boolean {
  const len = array.length
  let i = -1

  while (++i < len) {
    if (!func(array[i], i)) {
      return false
    }
  }

  return true
}

export function map <T, U> (array: ArrayLike<T>, func: (item: T, index: number) => U): U[] {
  const len = array.length
  const mapped = Array(len)
  let i = -1

  while (++i < len) {
    mapped[i] = func(array[i], i)
  }

  return mapped
}

export function filter <T> (array: ArrayLike<T>, func: (item: T, index: number) => boolean): T[] {
  const len = array.length
  let i = -1
  let item
  const filtered: T[] = []
  let f = -1

  while (++i < len) {
    item = array[i]

    if (func(item, i)) {
      filtered[++f] = item
    }
  }

  return filtered
}

export function reduce <T> (array: T[], func: (item: T, aggr: T, index: number) => T): T {
  var len = array.length
    , i = 0
    , aggr = array[i]

  if (array.length < 2) {
    throw new Error('reduce of empty array with no initial value')
  }

  while (++i < len) {
    aggr = func(aggr, array[i], i)
  }

  return aggr
}

export function fold <T, U> (array: T[], aggr: U, func: (aggr: U, item: T, index: number) => U): U {
  var len = array.length
    , i = -1

  while (++i < len) {
    aggr = func(aggr, array[i], i)
  }

  return aggr
}

export function reduceRight <T> (array: T[], func: (item: T, aggr: T, index: number) => T): T {
  var i = array.length
    , aggr = array[--i]

  if (array.length < 2) {
    throw new Error('reduce of empty array with no initial value')
  }

  while (i--) {
    aggr = func(array[i], aggr, i)
  }

  return aggr
}

export function foldRight <T, U> (array: T[], aggr: U, func: (item: T, aggr: U, index: number) => U): U {
  var i = array.length

  while (i--) {
    aggr = func(array[i], aggr, i)
  }

  return aggr
}

export function find <T> (array: T[], func: (item: T, index: number) => boolean, offset: number = 0): T|null {
  var len = array.length
    , i = offset

  for (; i < len; ++i) {
    if (func(array[i], i)) {
      return array[i]
    }
  }

  return null
}

export function findIndex <T> (array: T[], func: (item: T, index: number) => boolean, offset: number = 0): number {
  var len = array.length
    , i = offset

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
export function forBoth <T, U> (array: T[], brray: U[], func: (aitem: T, bitem: U, index: number) => boolean | void) {
  var len = array.length
    , i = -1

  if (len !== brray.length) {
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
export function append <T> (trg: T[], src: T[]): T[] {
  var off = trg.length
    , len = src.length
    , i = -1

  trg.length += len // JIT: pre-allocate

  while (++i < len) {
    trg[off+i] = src[i]
  }

  return trg
}

export function range (begin: number, step?: number, end?: number) {
  var result: number[] = []
    , i = -1

  if (isUndefined(step)) {
    end = begin
    step = 1
    begin = 0
  }
  else if (isUndefined(end)) {
    end = step
    step = 1
  }

  for (; begin < end; begin += step) {
    result[++i] = begin
  }

  return result
}

export function flatten <T> (array: T[][]): T[] {
  const result: T[] = []
  return result.concat(...array);
}