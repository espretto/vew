
import { Object } from './global'
import { extend, create } from './object'

export default extend(create(null), {

  /**
   * @this Base
   * @return {Base}
   */  
  new () {
    var instance = create(this)
    instance.init.apply(instance, arguments)
    return instance
  }

  /**
   * @this Base
   * @return {Base}
   */
, init () {
    // pass
  }

  /**
   * @this Base
   * @return {object}
   */
, derive () {
		var proto = create(this)
			, len = arguments.length
			, i = -1

		while (++i < len) {
			extend(proto, arguments[i])
		}

		return proto
  }

  /**
   * @return {bool}
   */
, isPrototypeOf: Object.isPrototypeOf

})