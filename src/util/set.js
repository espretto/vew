

import { forEach } from './array'
import { uniqueId } from './misc'
import { Set as NativeSet } from './global'
import { isUndefined, isFunction } from './type'

function SetShim (items) {
	this.items = []
	this.ident = uniqueId('__set')

	if (items) {
		forEach(items, item => { this.add(item) })
	}
}

SetShim.prototype = {

, has (item) {
		return item[this.ident]
	}

, add (item) {
		if (!item[this.ident]) {
			item[this.ident] = true
			this.items.push(item)
		}
	}

, clear (cleanup) {
		var that = this

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

const isNative = (
	!isUndefined(NativeSet) &&
	isFunction(new NativeSet().values) &&
	isUndefined(new NativeSet().values.next)
)

export const Set = isNative ? NativeSet : SetShim

// const CustomEnum = Base.derive({

// 	init (keys) {
// 		var enums = this.enums = {}
// 		forEach(keys, key => { enums[key] = 1 })
// 	}

// , has (key) {
// 		return this.enums.hasOwnProperty(key)
// 	}
// })

// export const Enum = isNative ? NativeSet : keys => CustomEnum.new(keys)
