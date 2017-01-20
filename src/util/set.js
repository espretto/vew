
import { Set } from './global'
import { forEach } from './array'
import { uniqId } from './misc'
import { isUndefined, isFunction } from './type'

function SetShim () {
	this._items = []
	this._ident = uniqId('__set')
}

SetShim.prototype = {

	has (item) {
		return item[this._ident]
	}

, add (item) {
		if (!item[this._ident]) {
			item[this._ident] = true
			this._items.push(item)
		}
	}

, clear (cleanup) {
		forEach(this._items, cleanup
			? item => { delete item[this._ident] }
			: item => { item[this._ident] = false }
		)

		this._items.length = 0
	}

, forEach (func) {
		forEach(this._items, func)
	}
}

export default (
	!isUndefined(Set) &&
	isFunction(new Set().values) &&
	isUndefined(new Set().values.next)
) ? Set : SetShim
