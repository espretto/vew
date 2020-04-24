
import { Set } from './global'
import { isUndefined, isFunction } from './type'
import { hasOwn, forOwn } from './object'
import { forEach } from './array'


function CustomSet (hash) {
  this.hash = hash
  this.items = {}
}

CustomSet.prototype = {

  has (item) {
    return hasOwn(this.items, this.hash(item))
  },

  add (item) {
    const hash = this.hash(item)
    if (!hasOwn(this.items, hash)) {
      this.items[hash] = item
    }
    return this
  },
  
  forEach (func) {
    forOwn(this.items, func)
  },
  
  clear () {
    this.items = {}
  }
}

function createNativeSet () {
  return new Set()
}

function createCustomSet (key) {
  return new CustomSet(key)
}

type setFactory = <T> (key: T => string|number) => Set<T>

const createSet: setFactory = !isUndefined(Set) && isFunction(new Set().values)
  ? createNativeSet
  : createCustomSet
