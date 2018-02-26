
import { Set } from './global'
import { isUndefined, isFunction } from './type'
import { forEach, insertAt, sortedIndexBy } from './array'

/**
 * this shim uses a sorted array and does not maintain the order in which
 * the items were added. all items must have the sorting property.
 */
function CustomSet (initials) {
  this.items = initials || []
}

CustomSet.prototype = {

  constructor: CustomSet

, add (item) {
    var i = sortedIndexBy(this.items, item, item => item.getComparableId())
    if (i < 0) insertAt(this.items, item, ~i)
    return this
  }
  
, forEach (func) {
    forEach(this.items, func)
  }
  
, clear () {
    this.items.length = 0
  }
}

export default !isUndefined(Set) && isFunction(new Set().values) ? Set : CustomSet
