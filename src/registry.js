
import { hasOwn } from './util/object'

export default {

  components: {
    
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
