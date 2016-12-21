
import { Set } from './global'
import { forEach } from './array'
import { uniqueId } from './misc'
import { isUndefined, isFunction } from './type'

function SetShim (items) {
	this.items = []
	this.ident = uniqueId('__set')

	if (items) {
		var that = this // babel function hoisting
		forEach(items, item => { that.add(item) })
	}
}

SetShim.prototype = {

	has (item) {
		return item[this.ident]
	}

, add (item) {
		if (!item[this.ident]) {
			item[this.ident] = true
			this.items.push(item)
		}
	}

, clear (cleanup) {
		var that = this // babel function hoisting

		forEach(that.items, cleanup
			? item => { delete item[that.ident] }
			: item => { item[that.ident] = false }
		)

		that.items.length = 0
	}

, forEach (func) {
		forEach(this.items, func)
	}
}

export default (
	!isUndefined(Set) &&
	isFunction(new Set().values) &&
	isUndefined(new Set().values.next)
) ? Set : SetShim
