
import Base from './util/base'
import Sett from './util/sett'
import { toPath, has } from './util/path'
import { forEach, remove, fold } from './util/array'
import { isObject, isUndefined, protof } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, deleteValue } from './util/object'
import { Object, ObjectProto, Array, ArrayProto, Date, DateProto, Error } from './util/global'

export default Base.derive({

  constructor (data) {
    this._root = SubscriptionTreeNode.create(null)
    this._tasks = Sett('id')
    this._dirty = Sett('id')

    // varies inner class
    this.data = data
  }

, subscribe (path, task) {
    this._root.resolveOrCreate(toPath(path)).tasks.push(task)
  }

, unsubscribe (path, task) {
    var sub = this._root.resolve(toPath(path))

    remove(sub.tasks, task)

    for (; sub; sub = sub.parent) {
      if (sub.isEmpty()) {
        sub.remove()
      }
    }
  }

, resolve (path) {
    return fold(toPath(path), this.data, (obj, key) => obj[key])
  }

, _notify (sub) {
    for (; sub; sub = sub.parent) {
      if (sub.tasks.length) {
        this._dirty.add(sub)
      }
    }
  }

, update () {
    const scope = this
        , tasks = scope._tasks
        , dirty = scope._dirty

    dirty.forEach(sub => {
      forEach(sub.tasks, task => {
        tasks.add(task)
      })
    })

    // begin requestAnimationFrame
    tasks.forEach(task => { task.call(scope) })
    // end requestAnimationFrame

    tasks.clear()
    dirty.clear()
  }

, merge (/*[path,] src*/) {
    
    if (arguments.length < 2) {
      var sub = this._root
        , trg = this.data
        , src = arguments[0]

      this.data = isUndefined(trg)
        ? this._mergeDeep(trg, src, sub)
        : this._cloneDeep(src, sub)
    }
    else {
      var path = toPath(arguments[0])
        , sub = this._root.resolve(path)
        , tail = path.pop() // [1]
        , trg = this.resolve(path)
        , src = arguments[1]

      path.push(tail) // [1]

      if (DEBUG && !isObject(trg)) {
        throw new Error('cannot set property onto primitive value')
      }

      trg[tail] = has(trg, tail)
        ? this._mergeDeep(trg[tail], src, sub)
        : this._cloneDeep(src, sub)
    }
  }

, _mergeDeep (trg, src, sub) {

    // merge mutables
    if (isObject(trg) && isObject(src)) {
      const trgProto = protof(trg)
          , srcProto = protof(src)

      if (trgProto === ArrayProto || trgProto === ObjectProto) {
        if (srcProto === ArrayProto) {
          return this._mergeArray(trg, src, sub, false)
        }
        else if (srcProto === ObjectProto) {
          return this._mergeObject(trg, src, sub, false)
        }
      }
      else if (trgProto === DateProto && srcProto === DateProto && +trg !== +src) {
        trg.setTime(src)
        this._notify(sub)
        return trg
      }
    }

    // fall through to same-value-zero comparison
    if (trg === trg ? trg !== src : src === src) {
      this._notify(sub)
    }

    return src
  }

, _cloneDeep (src, sub) {
    this._notify(sub)

    if (isObject(src)) {
      switch (protof(src)) {
        case ArrayProto:
          return this._mergeArray(Array(src.length), src, sub, true)
        case ObjectProto:
          return this._mergeObject({}, src, sub, true)
        case DateProto:
          return new Date(src)
        default:
          throw new Error('cannot clone unknown, non-primitive value format\n\n' + JSON.stringify(src))  
      }
    }

    return src
  }

, _mergeObject (trg, src, sub, clone) {
    var children = sub.children
    
    forOwn(src, (value, key) => {
      var closest = getOwn(children, key, sub)

      trg[key] = !clone && hasOwn.call(trg, key)
        ? this._mergeDeep(trg[key], value, closest)
        : this._cloneDeep(value, closest)
    })

    return trg
  }

, _mergeArray (trg, src, sub, clone) {
    var children = sub.children
      , length = trg.length

    forEach(src, (value, i) => {
      var closest = getOwn(children, i, sub)

      trg[i] = !clone && i < length
        ? this._mergeDeep(trg[i], value, closest)
        : this._cloneDeep(value, closest)
    })

    if (length !== trg.length) {
      this._notify(getOwn(children, 'length', sub))
    }

    return trg
  }

  /**
   * skip deep comparison completely and simply set the new value.
   * then deeply invalidate all Subscriptions associated to the affected paths.
   */
, replace () {
    throw new Error('not yet implemented')
  }
})

const SubscriptionTreeNode = Base.derive({

  /** class variable */
  id: 0

, constructor (parent) {
    this.id = this.id++
    this.parent = parent
    this.tasks = []
    this.children = {}
  }

, isEmpty () {
    return !this.tasks.length && isEmptyObject(this.children)
  }

, remove () {
    const parent = this.parent
    if (parent) deleteValue(parent.children, this)
  }

, resolve (path) {
    var sub = this
    forEach(path, key => !!(sub = getOwn(sub.children, key, null)))
    return sub
  }

, resolveOrCreate (path) {
    return fold(path, this, (sub, key) => {
      var children = sub.children
      return hasOwn.call(children, key)
        ? children[key]
        : (children[key] = SubscriptionTreeNode.create(sub))
    })
  }
})
