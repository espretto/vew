/* @flow */

import type { KeyPath } from './util/path'

import { toKeyPath, has } from './util/path'
import { forEach, every, remove, fold } from './util/array'
import { isString, isObject, isUndefined, protof } from './util/type'
import { objectProto, stringProto, arrayProto, dateProto } from './util/type'
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

  subscribe (path: string|KeyPath, task: Function) {
    if (isString(path)) path = toKeyPath(path)
    this.root.resolveOrCreate(path).tasks.push(task)
  }

  /* TODO : why would you ever unsubscribe and not destroy the whole scope instance anyway ? */
  unsubscribe (path: string|KeyPath, task: Function) {
    if (isString(path)) path = toKeyPath(path)

    var sub = this.root.resolve(path)

    remove(sub.tasks, task)

    for (; sub && sub.isEmpty(); sub = sub.parentNode) {
      sub.remove()
    }
  }

  resolve (path: string|KeyPath) {
    if (isString(path)) path = toKeyPath(path)
    return fold(path, this.data, (obj, key) => obj[key])
  }

  notify (sub: SubscriptionNode) {
    if (!this.dirty.has(sub)) {
      this.dirty.add(sub)

      if (sub.parentNode) {
        this.notify(sub.parentNode)
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

  merge (src: any) {
    this.data = isUndefined(this.data)
      ? this.cloneDeep(src, this.root)
      : this.mergeDeep(this.data, src, this.root)
  }

  mergeDeep (trg: any, src: any, sub: SubscriptionNode) {

    // merge mutables
    if (isObject(src)) {
      const srcProto = protof(src)
      console.assert(srcProto === protof(trg), 'type mismatch while merging')

      switch (srcProto) {
        case arrayProto:
          return this.mergeArray(trg, src, sub, false)
        case objectProto:
          return this.mergeObject(trg, src, sub, false)
        case dateProto:
          return this.mergeDate(trg, src, sub, false)
        default:
          console.assert(false, 'cannot merge type of', src)
      }
    }

    // fall through to same-value-zero comparison
    if (trg === trg ? trg !== src : src === src) {
      this.notify(sub)
    }

    return src
  }

  cloneDeep (src: any, sub: SubscriptionNode) {
    this.notify(sub)

    if (isObject(src)) {
      switch (protof(src)) {
        case arrayProto:
          return this.mergeArray(new Array(src.length), src, sub, true)
        case objectProto:
          return this.mergeObject({}, src, sub, true)
        case dateProto:
          return this.mergeDate(new Date(), src, sub, true)
        default:
          console.assert(false, 'cannot clone type of', src)
      }
    }

    return src
  }

  mergeObject (trg: any, src: any, sub: SubscriptionNode, clone: boolean) {
    const childNodes = sub.childNodes

    forOwn(src, (srcValue, srcKey) => {
      const closest = getOwn(childNodes, srcKey, sub)

      trg[srcKey] = !clone && hasOwn.call(trg, srcKey)
        ? this.mergeDeep(trg[srcKey], srcValue, closest)
        : this.cloneDeep(srcValue, closest)
    })

    return trg
  }

  mergeArray (trg: Array<any>, src: Array<any>, sub: SubscriptionNode, clone: boolean) {
    const childNodes = sub.childNodes
    const trgLength = trg.length

    forEach(src, (srcValue, srcIndex) => {
      const closest = getOwn(childNodes, srcIndex, sub)

      trg[srcIndex] = !clone && srcIndex < trgLength
        ? this.mergeDeep(trg[srcIndex], srcValue, closest)
        : this.cloneDeep(srcValue, closest)
    })

    if (trgLength !== trg.length) {
      this.notify(getOwn(childNodes, 'length', sub))
    }

    return trg
  }

  mergeDate(trg: Date, src: Date, sub: SubscriptionNode, clone: boolean) {
    if (clone) {
      trg.setTime(+src)
    }
    else if (+src !== +trg) {
      trg.setTime(+src)
      this.notify(sub)
    }
    else {
      return src
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

  remove () {
    if (this.parentNode) deleteValue(this.parentNode.childNodes, this)
  }

  resolve (path: KeyPath) {
    return fold(path, this, (node, key) => node.childNodes[key])
  }

  resolveOrCreate (path: KeyPath) {
    return fold(path, this, (node, key) => {
      const childNodes = node.childNodes

      if (hasOwn.call(childNodes, key)) {
        return childNodes[key]
      }
      else {
        return childNodes[key] = new SubscriptionNode(node)
      }
    })
  }
}

export default Scope
