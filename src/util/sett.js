
import Base from './base'
import { Set } from './global'
import { isUndefined, isFunction } from './type'
import { forEach, insertAt, sortedIndexFor } from './array'

/**
 * this shim uses a sorted array and does not maintain the order in which
 * the items were added. all items must have the sorting property.
 */
const Sett = Base.derive({

  constructor (prop) {
    this._data = []
    this._prop = prop
  }

, add: function (item) {
    var data = this._data
      , prop = this._prop
      , i = sortedIndexFor(data, item, prop)
    
    if (i === data.length) {
    	data.push(item)
    }
    else if (data[i][prop] !== item[prop]) {
    	insertAt(data, item, i)
    }

    return this
  }
  
, forEach: function (func) {
    forEach(this._data, func)
  }
  
, clear: function () {
    this._data.length = 0
  }
})

export default !isUndefined(Set) && isFunction(new Set().values)
 ? prop => new Set()
 : prop => Sett.create(prop)
