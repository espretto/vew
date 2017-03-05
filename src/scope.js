
import Set from './util/set'
import Base from './util/base'
import { toPath, has } from './util/path'
import { forEach, remove, fold } from './util/array'
import { Object, Array, Date, Error } from './util/global'
import { isPlainObject, isArray, isObject, isDate } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, deleteValue } from './util/object'

export default Base.derive({

  constructor (data) {
    this.data = data
    this._root = SubscriptionTreeNode.create()
    this._tasks = new Set()
    this._dirty = new Set()
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

      this.data = trg !== undefined
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

    // test mutability
    const trgHas = isArray(trg) || isPlainObject(trg)
        , srcEach = isArray(src) && forEach || isPlainObject(src) && forOwn

    // merge mutables with keys
    if (trgHas && srcEach) {
      trg = this._mergeEach(trg, src, trgHas, srcEach, sub)
    }
    // mutate date objects
    else if (isDate(trg) && isDate(src) && +trg !== +src) {
      trg.setTime(src)
      this._notify(sub)
    }
    // override if immutable values differ by SameValueZero-comparison
    else if (!trgHas && !srcEach && (trg === trg ? trg !== src : src === src)) {
      trg = src
      this._notify(sub)
    }

    return trg
  }

, _cloneDeep (src, sub) {
    this._notify(sub)

    if (isObject(src)) {
      
      if (isArray(src)) {
        return this._mergeEach(Array(src.length), src, false, forEach, sub)
      }
      else if (isPlainObject(src)) {
        return this._mergeEach({}, src, false, forOwn, sub)
      }
      else if (isDate(src)) {
        return new Date(src)
      }
      else if (DEBUG) {
        throw new Error('cannot clone unknown, non-primitive value format\n\n' + JSON.stringify(src))
      }
    }

    return src
  }

, _mergeEach (trg, src, trgHas, srcEach, parent) {
    var trgIsArray = isArray(trg)
      , trgLength = trg.length
      , children = parent.children
      , once = true

    srcEach(src, (value, key) => {
      var sub = getOwn(children, key, parent)

      // merge if the key is common
      if (trgHas && (trgIsArray ? key < trgLength : hasOwn.call(trg, key))) {
        trg[key] = this._mergeDeep(trg[key], value, sub)
      }
      // clone if the key is foreign
      else {
        trg[key] = this._cloneDeep(value, sub)

        if (once && trgIsArray) {
          this._notify( sub.children['length'] )
          once = false
        }
      }
    })

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

  constructor (parent) {
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
    forEach(path, key => !!(sub = getOwn(sub.children, key)))
    return sub
  }

, resolveOrCreate (path) {
    return fold(path, this, (sub, key) => {
      var children = sub.children
      return getOwn(children, key) || (children[key] = SubscriptionTreeNode.create(sub))
    })
  }
})
