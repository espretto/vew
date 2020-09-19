import { extend, create } from './object'

export default extend(create(null), {
  
  constructor () {
    // abstract noop
  }

, create () {
    var instance = create(this)
    instance.constructor.apply(instance, arguments)
    return instance
  }

, derive (proto) {
    return extend(create(this), proto)
  }
})
