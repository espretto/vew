
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

    add: function (component) {
      var index = this.indices.length ? this.indices.pop() : this.items.length
      this.items[index] = component
      component.id = index
    },

    remove: function (component) {
      var index = component.id
      this.items[index] = null
      this.indices.push(index)
    },

    defrag: function () {
      for (var i = this.items.length; i-- && this.indices.length;) {
        if (this.items[i] !== null) {
          var index = this.indices.pop()
          this.items[index] = reg[i]
          component.id = index
        }
      }

      this.items.length = i + 1
    }
  }

  return Pool

}())