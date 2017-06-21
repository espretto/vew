
import Cache from './util/cache'
import { hasOwn } from './util/object'

export default {

  expressions: Cache.create()

, components: {
    
    _store: {}

  , has (name) {
      return hasOwn.call(this._store, name)
    }

  , get (name) {
      return this._store[name]
    }

  , add (name, component) {
      this._store[name] = component
    }
  }

}
