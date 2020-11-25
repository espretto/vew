
/**
 * ids are unique among all objects at a given time
 * removed objects' ids are recycled
 */
var Pool = (function () {

  function Pool () {
    this.items = []
    this.indices = []
  }

  Pool.prototype = {

    constructor: Pool,

    add: function (item) {
      var index = this.indices.length ? this.indices.pop() : this.items.length
      this.items[index] = item
      item.id = index
    },

    remove: function (item) {
      var index = item.id
      this.items[index] = null
      this.indices.push(index)
    },

    defrag: function () {
      throw new Error('not yet implemented')
    }
  }

  return Pool

}())