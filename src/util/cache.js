
import Base from './base'
import { hasOwn } from './object'

export default Base.derive({

  constructor () {
    this.store = {}
  }

, add (item) {
    const store = this.store
        , key = item.cacheKey()
    
    return hasOwn.call(store, key)
      ? store[key]
      : (store[key] = item.cacheValue())
  }

, get (key) {
    return this.store[key]
  }
})
