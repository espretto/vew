import type { KeyPath } from './util/path'

import { extend, create, keys } from './util/object'
import { forEach, remove, fold } from './util/array'
import { isObject, getTag } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, deleteValue } from './util/object'


export class Store {

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

  subscribe (path: KeyPath, task: Function) {
    this.root.resolveOrCreate(path).tasks.push(task)
  }

  /* TODO : why would you ever unsubscribe and not destroy the whole scope instance anyway ? */
  unsubscribe (path: KeyPath, task: Function) {
    var sub: SubscriptionNode | undefined = this.root.resolve(path)
    remove(sub.tasks, task)

    while (sub && sub.isEmpty()) {
      sub.remove()
      sub = sub.parentNode
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
    this.data = this._merge(this.data, src, this.root)
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
    forOwn(sub.childNodes, sub => {
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
      const trgTag = getTag.call(trg)
      const srcTag = getTag.call(src)

      console.assert(trgTag === srcTag, 'type mismatch while merging')

      switch (trgTag) {
        case "[object Array]":
          return this._mergeArray(trg as unknown[], src as unknown[], sub)
        case "[object Object]":
          return this._mergeObject(trg as object, src as {}, sub)
        case "[object Date]":
          return this._mergeDate(trg as Date, src as Date, sub)
        default:
          console.assert(false, 'cannot merge type of', src)
      }
    }
    
    if (trg === trg ? trg !== src : src === src) {
      this._notify(sub)
      return src
    }
  }

  _mergeObject (trg: object, src: {}, sub: SubscriptionNode) {
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

  _mergeArray (trg: unknown[], src: unknown[], sub: SubscriptionNode) {
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

/**
 * used to stack multiple stores.
 */
export class StoreLayer extends Store {

  ground: Store

  constructor (data: any, ground: Store) {
    super(data)
    // layer data by means of the prototype chain
    this.data = extend(create(ground.data), data)
    this.ground = ground
  }

  getLayer (path: KeyPath) {
    return hasOwn(this.data, path[0]) ? this : this.ground
  }

  subscribe (path: KeyPath, task: Function) {
    return super.subscribe.call(this.getLayer(path), path, task)
  }

  unsubscribe (path: KeyPath, task: Function) {
    return super.unsubscribe.call(this.getLayer(path), path, task)
  }

  merge (src: any) {
    console.assert(keys(src).every(key => hasOwn(this.data, key)), "cannot merge data into ground store")
    super.merge(src)
  }
}


class SubscriptionNode {

  tasks: Function[]
  parentNode?: SubscriptionNode
  childNodes: { [pathSegment in string|number]: SubscriptionNode }

  constructor (parentNode?: SubscriptionNode) {
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

  resolve (this: SubscriptionNode, path: KeyPath) {
    return fold(path, this, (node, key) => node.childNodes[key])
  }

  resolveOrCreate (this: SubscriptionNode, path: KeyPath) {
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
