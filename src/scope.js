
/**
 * for the scope to work you have to subscribe AND provide the data
 */
import Base from './util/oloo'
import { Set } from './util/set'
import { thisify } from './util/function'
import { toPath, resolve, has } from './util/path'
import { forEach, remove, fold } from './util/array'
import { Object, Array, Date, Error } from './util/global'
import { isPlainObject, isArray, isObject, isDate } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, del } from './util/object'

/**
 * subscription sub
 */
const SubscriptionNode = Base.derive({

  /**
   * @this SubscriptionNode
   * @return {SubscriptionNode}
   */
  init (parent) {
    /** @type {SubscriptionNode} */
    this.parent = parent
    this.actions = []
    this.children = {}
  }

  /**
   * @this SubscriptionNode
   * @return {bool}
   */
, isEmpty () {
    return this.actions.length === 0 && isEmptyObject(this.children)
  }

  /**
   * @this SubscriptionNode
   */
, remove () {
    const parent = this.parent
    if (parent) del(parent.children, this)
  }

  /**
   * @this SubscriptionNode
   * @return {SubscriptionNode}
   */
, resolve (path) {
    return fold(path, this, (sub, key) => sub && getOwn(sub.children, key))
  }

  /**
   * @this SubscriptionNode
   * @return {SubscriptionNode}
   */
, resolveOrCreate (path) {
    return fold(path, this, (sub, key) => {
      const children = sub.children
      var child

      if (hasOwn.call(children, key)) {
        child = children[key]
      }
      else {
        child = children[key] = SubscriptionNode.new(sub)
      }

      return child
    })
  }
})

/**
 * template scope
 */
const Scope = Base.derive({

  /**
   * @this Scope
   */
  init (data) {

    /** @type {*} */
    this.data = data

    /** @type {SubscriptionNode} */
    this.root = SubscriptionNode.new()

    /** @type {Set} */
    this.todos = new Set()

    /** @type {Set} */
    this.actions = new Set()
  }

  /**
   * @this Scope
   */
, subscribe (path, action) {
    this.root.resolveOrCreate(toPath(path)).actions.push(action)
  }

  /**
   * @this Scope
   */
, unsubscribe (path, action) {
    var sub = this.root.resolve(toPath(path))

    remove(sub.actions, action)

    for (; sub; sub = sub.parent) {
      if (sub.isEmpty()) {
        sub.remove()
      }
    }
  }

  /**
   * @this Scope
   */
, notify (sub) {
    const todos = this.todos

    for (; sub && !todos.has(sub); sub = sub.parent) {
      if (sub.actions.length) {
        todos.add(sub)
      }
    }
  }

  /**
   * @this Scope
   */
, update () {
    const scope = this
      , todos = scope.todos
      , actions = scope.actions

    todos.forEach(todo => {
      forEach(todo.actions, action => {
        actions.add(action)
      })
    })

    // begin requestAnimationFrame
    actions.forEach(action => { action.call(scope) })
    // end requestAnimationFrame

    todos.clear()
    actions.clear()
  }

  /**
   * @this Scope
   */
, resolve (path) {
    return fold(toPath(path), this.data, (obj, key) => obj[key] )
  }

  /**
   * @this Scope
   */
, merge (/*[path,] src*/) {
    
    if (arguments.length < 2) {
      var sub = this.root
        , trg = this.data
        , src = arguments[0]

      this.data = trg !== undefined
        ? this.mergeDeep(trg, src, sub)
        : this.cloneDeep(src, sub)
    }
    else {
      var path = toPath(arguments[0])
        , sub = this.root.resolve(path)
        , tail = path.pop() // [1]
        , trg = resolve(this.data, path)
        , src = arguments[1]

      path.push(tail) // [1]

      if (DEBUG && !isObject(trg)) {
        throw new Error('cannot set property onto primitive value')
      }

      trg[tail] = has(trg, tail)
        ? this.mergeDeep(trg[tail], src, sub)
        : this.cloneDeep(src, sub)
    }
  }

  /**
   * @this Scope
   */
, mergeDeep (trg, src, sub) {

    // test mutability
    const trgHas = isArray(trg) || isPlainObject(trg)
        , srcEach = isArray(src) && forEach || isPlainObject(src) && forOwn

    // merge mutables with keys
    if (trgHas && srcEach) {
      trg = this.mergeEach(trg, src, trgHas, srcEach, sub)
    }
    // mutate date objects
    else if (isDate(trg) && isDate(src) && +trg !== +src) {
      trg.setTime(src)
      this.notify(sub)
    }
    // override if immutable values differ by SameValueZero-comparison
    else if (!trgHas && !srcEach && (trg === trg ? trg !== src : src === src)) {
      trg = src
      this.notify(sub)
    }

    return trg
  }

  /**
   * @this Scope
   */
, cloneDeep (src, sub) {
    this.notify(sub)

    if (isObject(src)) {
      
      if (isArray(src, true)) {
        return this.mergeEach(Array(src.length), src, false, forEach, sub)
      }
      else if (isPlainObject(src, true)) {
        return this.mergeEach({}, src, false, forOwn, sub)
      }
      else if (isDate(src, true)) {
        return new Date(src)
      }
      else if (DEBUG) {
        throw new Error('cannot clone unknown, non-primitive value format\n\n' + JSON.stringify(src))
      }
    }

    return src
  }

  /**
   * @this Scope
   */
, mergeEach (trg, src, trgHas, srcEach, parent) {
    const trgIsArray = isArray(trg, true)
        , trgLength = trg.length
        , children = parent.children

    var once = true

    srcEach(src, (value, key) => {
      var sub = getOwn(children, key, parent)

      // merge if the key is common
      if (trgHas && (trgIsArray ? key < trgLength : hasOwn.call(trg, key))) {
        trg[key] = this.mergeDeep(trg[key], value, sub)
      }
      // clone if the key is foreign
      else {
        trg[key] = this.cloneDeep(value, sub)

        if (once && trgIsArray) {
          this.notify( sub.children['length'] )
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

/*
Scope['get'] = Scope.get
Scope['set'] = Scope.set
Scope['update'] = Scope.update
Scope['subscribe'] = Scope.subscribe
Scope['unsubscribe'] = Scope.unsubscribe
*/

export default Scope