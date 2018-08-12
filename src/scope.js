/* @flow */

import type { Path } from './util/path'

import { toPath, has } from './util/path'
import { forEach, every, remove, fold } from './util/array'
import { isString, isObject, isUndefined, protof } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, deleteValue } from './util/object'

class Scope {

  data: any

  root: SubscriptionNode

  tasks: Set<Function>

  dirty: Set<SubscriptionNode>

  constructor (data: any) {
    this.data = data
    this.root = new SubscriptionNode()
    this.tasks = new Set()
    this.dirty = new Set()
  }
  
  subscribe (path: string, task: Function) {
    this.root.resolveOrCreate(toPath(path)).tasks.push(task)
  }
  
  unsubscribe (path: string, task: Function) {
    var sub = this.root.resolve(toPath(path))

    remove(sub.tasks, task)

    for (; sub; sub = sub.parent) {
      if (sub.isEmpty()) {
        sub.remove()
      }
    }
  }
  
  resolve (path: string|Path) {
    if (isString(path)) path = toPath(path)
    
    return fold(path, this.data, (obj, key) => obj[key])
  }
  
  notify (sub: ?SubscriptionNode) {
    for (; sub; sub = sub.parent) {
      if (sub.tasks.length) {
        this.dirty.add(sub)
      }
    }
  }
  
  update () {
    this.dirty.forEach(sub => {
      forEach(sub.tasks, task => {
        this.tasks.add(task)
      })
    })

    // begin requestAnimationFrame
    this.tasks.forEach(task => { task.call(this) })
    // end requestAnimationFrame

    this.tasks.clear()
    this.dirty.clear()
  }
  
  merge (/*[path,] src*/) {
    
    if (arguments.length < 2) {
      var sub = this.root
        , trg = this.data
        , src = arguments[0]

      this.data = isUndefined(trg)
        ? this._mergeDeep(trg, src, sub)
        : this._cloneDeep(src, sub)
    }
    else {
      var path = toPath(arguments[0])
        , sub = this.root.resolve(path)
        , tail = path.pop() // [1]
        , trg = this.resolve(path)
        , src = arguments[1]

      path.push(tail) // [1]

      if (!isObject(trg)) {
        throw new Error('cannot set property onto primitive value')
      }

      trg[tail] = has(trg, tail)
        ? this._mergeDeep(trg[tail], src, sub)
        : this._cloneDeep(src, sub)
    }
  }
  
  _mergeDeep (trg, src, sub) {

    // merge mutables
    if (isObject(trg) && isObject(src)) {
      const trgProto = protof(trg)
          , srcProto = protof(src)

      if (trgProto === Array.prototype || trgProto === Object.prototype) {
        if (srcProto === Array.prototype) {
          return this._mergeArray(trg, src, sub, false)
        }
        else if (srcProto === Object.prototype) {
          return this._mergeObject(trg, src, sub, false)
        }
      }
      else if (trgProto === Date.prototype && srcProto === Date.prototype && +trg !== +src) {
        trg.setTime(src)
        this.notify(sub)
        return trg
      }
    }

    // fall through to same-value-zero comparison
    if (trg === trg ? trg !== src : src === src) {
      this.notify(sub)
    }

    return src
  }
  
  _cloneDeep (src, sub) {
    this.notify(sub)

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
  
  _mergeObject (trg, src, sub, clone) {
    var children = sub.children
    
    forOwn(src, (value, key) => {
      var closest = getOwn(children, key, sub)

      trg[key] = !clone && hasOwn.call(trg, key)
        ? this._mergeDeep(trg[key], value, closest)
        : this._cloneDeep(value, closest)
    })

    return trg
  }
  
  _mergeArray (trg, src, sub, clone) {
    var children = sub.children
      , length = trg.length

    forEach(src, (value, i) => {
      var closest = getOwn(children, i, sub)

      trg[i] = !clone && i < length
        ? this._mergeDeep(trg[i], value, closest)
        : this._cloneDeep(value, closest)
    })

    if (length !== trg.length) {
      this.notify(getOwn(children, 'length', sub))
    }

    return trg
  }

  /**
   * skip deep comparison completely and simply set the new value.
   * then deeply invalidate all Subscriptions associated to the affected paths.
   */  
  replace () {
    throw new Error('not yet implemented')
  }
}

class SubscriptionNode {

  tasks: Function[]
  parent: ?SubscriptionNode
  children: { [key: string]: SubscriptionNode }

  constructor (parent: ?SubscriptionNode) {
    this.parent = parent
    this.tasks = []
    this.children = {}
  }
  
  isEmpty () {
    return !this.tasks.length && isEmptyObject(this.children)
  }
  
  remove () {
    if (this.parent) deleteValue(this.parent.children, this)
  }
  
  resolve (path: Path) {
    var node = this

    every(path, key => {
      var hasChild = hasOwn.call(node.children, key)
      if (hasChild) node = node.children[key]
      return hasChild
    })

    return node
  }
  
  resolveOrCreate (path: Path) {
    return fold(path, this, (node, key) => {
      const children = node.children

      if (hasOwn.call(children, key)) {
        return children[key]
      }
      else {
        return children[key] = new SubscriptionNode(node)
      }
    })
  }
}

export default Scope
