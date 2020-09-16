/* @flow */

import type { KeyPath } from './util/path'

import { toKeyPath } from './util/path'
import { forEach, every, remove, fold, filter } from './util/array'
import { isString, isObject, isUndefined, protof } from './util/type'
import { objectProto, stringProto, arrayProto, dateProto } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, deleteValue, keys, create, extend } from './util/object'


export class Store {

  state: any

  root: SubscriptionNode

  tasks: Set<Function>

  dirty: Set<SubscriptionNode>

  constructor (state: any) {
    this.state = state
    this.root = new SubscriptionNode()
    this.tasks = new Set()
    this.dirty = new Set()
  }

  subscribe (path: KeyPath, task: Function) {
    this.root.resolveOrCreate(path).tasks.push(task)
  }

  /* TODO : why would you ever unsubscribe and not destroy the whole scope instance anyway ? */
  unsubscribe (path: KeyPath, task: Function) {
    var sub = this.root.resolve(path)
    remove(sub.tasks, task)

    for (; sub && sub.isEmpty(); sub = sub.parentNode) {
      sub.remove()
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

  merge (src: any) {
    this.state = this._merge(this.state, src, this.root)
  }

  _notify (sub: SubscriptionNode) {
    if (!this.dirty.has(sub)) {
      this.dirty.add(sub)

      if (sub.parentNode) {
        this._notify(sub.parentNode)
      }
    }
  }

  _invalidate (sub: SubscriptionNode) {
    forOwn(sub.childNodes, (sub, key) => {
      this.dirty.add(sub)
      this._invalidate(sub)
    })
  }

  _merge (trg: any, src: any, sub: SubscriptionNode) {
    // bail out on referential equality
    if (trg === trg ? trg === src : src !== src) {
      return trg
    }

    if (isObject(trg) && src == null || trg == null && isObject(src)) {
      this._notify(sub)
      this._invalidate(sub)
      return src
    }

    if (isObject(trg) && isObject(src)) {
      const trgProto = protof(trg)
      const srcProto = protof(src)

      console.assert(trgProto === srcProto, 'type mismatch while merging')

      switch (trgProto) {
        case arrayProto:
          return this._mergeArray(trg, src, sub)
        case objectProto:
          return this._mergeObject(trg, src, sub)
        case dateProto:
          return this._mergeDate(trg, src, sub)
        default:
          console.assert(false, 'cannot merge type of', src)
      }
    }
    
    if (trg === trg ? trg !== src : src === src) {
      this._notify(sub)
      return src
    }
  }

  _mergeObject (trg: any, src: any, sub: SubscriptionNode) {
    const childNodes = sub.childNodes
    // TODO: the public api may not allow root subscriptions
    const hasRootSubscriptions = this.root.tasks.length > 0

    forOwn(src, (value, key) => {
      const closest = getOwn(childNodes, key, sub)

      if (this.root === closest && !hasRootSubscriptions) {
        trg[key] = value
      }
      else if (hasOwn(trg, key)) {
        trg[key] = this._merge(trg[key], value, closest)
      }
      else {
        trg[key] = value
        this._notify(closest)
        // TODO: cannot _invalidate unless we know for sure the subscription node
        // is the one corresponding to this the current data tree level
      }
    })

    return trg
  }

  _mergeArray (trg: Array<any>, src: Array<any>, sub: SubscriptionNode) {
    const childNodes = sub.childNodes

    if (trg.length !== src.length) {
      this._notify(getOwn(childNodes, 'length', sub))
    }

    const trgLength = trg.length

    // allocate/deallocate
    trg.length = src.length
    
    // TODO: the public api may not allow root subscriptions
    const hasRootSubscriptions = this.root.tasks.length > 0

    forEach(src, (value, index) => {
      const closest = getOwn(childNodes, index, sub)

      if (this.root === closest && !hasRootSubscriptions) {
        trg[index] = value
      }
      else if (index < trgLength) {
        trg[index] = this._merge(trg[index], value, closest)
      }
      else {
        trg[index] = value
        this._notify(closest)
        // TODO: cannot _invalidate unless we know for sure the subscription node
        // is the one corresponding to this the current data tree level
      }
    })

    return trg
  }

  _mergeDate(trg: Date, src: Date, sub: SubscriptionNode) {
    if (+trg !== +src) {
      this._notify(sub)
      // the tree ends here, no need to _invalidate
    }

    return src
  }
}


class SubscriptionNode {

  tasks: Function[]
  parentNode: ?SubscriptionNode
  childNodes: { [pathSegment: string|number]: SubscriptionNode }

  constructor (parentNode: ?SubscriptionNode) {
    this.tasks = []
    this.childNodes = {}
    this.parentNode = parentNode
  }

  isEmpty () {
    return !this.tasks.length && isEmptyObject(this.childNodes)
  }

  // TODO: do not delete but store subscription nodes for future use
  remove () {
    if (this.parentNode) deleteValue(this.parentNode.childNodes, this)
  }

  resolve (path: KeyPath) {
    return fold(path, this, (node, key) => node.childNodes[key])
  }

  resolveOrCreate (path: KeyPath) {
    return fold(path, this, (node, key) => {
      const childNodes = node.childNodes

      if (hasOwn(childNodes, key)) {
        return childNodes[key]
      }
      else {
        // TODO: do not create but reuse pooled subscription nodes
        return childNodes[key] = new SubscriptionNode(node)
      }
    })
  }
}
