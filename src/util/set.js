

import Base from './oloo'
import { forEach } from './array'
import { uniqueId } from './misc'
import { Set as NativeSet } from './global'
import { isUndefined, isFunction } from './type'

const CustomSet = Base.derive({

	/**
	 * @this CustomSet
	 */
	init (items) {
		this.items = items ? items.slice() : []
		this.ident = uniqueId('__set')
	}

	/**
	 * @this CustomSet
	 */
, has (item) {
		return item[this.ident]
	}

	/**
	 * @this CustomSet
	 */
, add (item) {
		if (!item[this.ident]) {
			item[this.ident] = true
			this.items.push(item)
		}
	}

	/**
	 * @this CustomSet
	 */
, clear (cleanup) {
		var that = this

		forEach(that.items, cleanup
			? item => { delete item[that.ident] }
			: item => { item[that.ident] = false }
		)

		that.items.length = 0
	}

	/**
	 * @this CustomSet
	 */
, forEach (func) {
		forEach(this.items, func)
	}

})

const isNative = (
	!isUndefined(NativeSet) &&
	isFunction(new NativeSet().values) &&
	isUndefined(new NativeSet().values.next)
)

export const Set = isNative ? NativeSet : items => CustomSet.new(items)

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
