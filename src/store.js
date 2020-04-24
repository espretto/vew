/* @flow */

import type { KeyPath } from './util/path'

import { toKeyPath } from './util/path'
import { forEach, every, remove, fold, filter } from './util/array'
import { isString, isObject, isUndefined, protof } from './util/type'
import { objectProto, stringProto, arrayProto, dateProto } from './util/type'
import { isEmptyObject, getOwn, hasOwn, forOwn, deleteValue, keys } from './util/object'

export interface Store {
  subscribe (path: KeyPath, task: Function): void;
  unsubscribe (path: KeyPath, task: Function): void;
  resolve (path: KeyPath): any;
  update (): void;
  merge (src: any): void;
  has (path: KeyPath): boolean;
}

class State implements Store {

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
    var sub = this.root.resolve(path)
    remove(sub.tasks, task)

    for (; sub && sub.isEmpty(); sub = sub.parentNode) {
      sub.remove()
    }
  }

  has (path: KeyPath) {
    return hasOwn(this.data, path[0])
  }

  resolve (path: KeyPath) {
    return fold(path, this.data, (obj, key) => obj[key])
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
      ? this._cloneDeep(src, this.root)
      : this._mergeDeep(this.data, src, this.root)
  }

  _notify (sub: SubscriptionNode) {
    if (!this.dirty.has(sub)) {
      this.dirty.add(sub)

      if (sub.parentNode) {
        this._notify(sub.parentNode)
      }
    }
  }

  _mergeDeep (trg: any, src: any, sub: SubscriptionNode) {

    // merge mutables
    if (isObject(src)) {
      const srcProto = protof(src)
      console.assert(srcProto === protof(trg), 'type mismatch while merging')

      switch (srcProto) {
        case arrayProto:
          return this._mergeArray(trg, src, sub, false)
        case objectProto:
          return this._mergeObject(trg, src, sub, false)
        case dateProto:
          return this._mergeDate(trg, src, sub, false)
        default:
          console.assert(false, 'cannot merge type of', src)
      }
    }

    // fall through to same-value-zero comparison
    if (trg === trg ? trg !== src : src === src) {
      this._notify(sub)
    }

    return src
  }

  _cloneDeep (src: any, sub: SubscriptionNode) {
    this._notify(sub)

    if (isObject(src)) {
      switch (protof(src)) {
        case arrayProto:
          return this._mergeArray(new Array(src.length), src, sub, true)
        case objectProto:
          return this._mergeObject({}, src, sub, true)
        case dateProto:
          return this._mergeDate(new Date(), src, sub, true)
        default:
          console.assert(false, 'cannot clone type of', src)
      }
    }

    return src
  }

  _mergeObject (trg: any, src: any, sub: SubscriptionNode, clone: boolean) {
    const childNodes = sub.childNodes

    forOwn(src, (srcValue, srcKey) => {
      const closest = getOwn(childNodes, srcKey, sub)

      trg[srcKey] = !clone && hasOwn(trg, srcKey)
        ? this._mergeDeep(trg[srcKey], srcValue, closest)
        : this._cloneDeep(srcValue, closest)
    })

    return trg
  }

  _mergeArray (trg: Array<any>, src: Array<any>, sub: SubscriptionNode, clone: boolean) {
    const childNodes = sub.childNodes
    const trgLength = trg.length

    forEach(src, (srcValue, srcIndex) => {
      const closest = getOwn(childNodes, srcIndex, sub)

      trg[srcIndex] = !clone && srcIndex < trgLength
        ? this._mergeDeep(trg[srcIndex], srcValue, closest)
        : this._cloneDeep(srcValue, closest)
    })

    if (trgLength !== trg.length) {
      this._notify(getOwn(childNodes, 'length', sub))
    }

    return trg
  }

  _mergeDate(trg: Date, src: Date, sub: SubscriptionNode, clone: boolean) {
    if (clone) {
      trg.setTime(+src)
    }
    else if (+src !== +trg) {
      trg.setTime(+src)
      this._notify(sub)
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


class Props implements Store {

  props: Store
  state: Store

  constructor (state: Store, data: any) {
    this.props = new State(data)
    this.state = state
  }

  subscribe (path: KeyPath, task: Function) {
    return this.props.has(path)
      ? this.props.subscribe(path, task)
      : this.state.subscribe(path, task)
  }

  unsubscribe (path: KeyPath, task: Function) {
    return this.props.has(path)
      ? this.props.unsubscribe(path, task)
      : this.state.unsubscribe(path, task)
  }

  resolve (path: KeyPath) {
    return this.props.has(path)
      ? this.props.resolve(path)
      : this.state.resolve(path)
  }

  update () {
    this.props.update()
    this.state.update()
  }

  merge (src: any) {
    console.assert(
      every(keys(src), key => !this.props.has([key])),
      `you are trying to update input properties
       [${filter(keys(src), key => this.props.has([key])).join()}]
       from within the receiving component. only its parent can do that.`
    )
    this.state.merge(src)
  }

  has (path: KeyPath) {
    return this.props.has(path) || this.state.has(path)
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

      if (hasOwn(childNodes, key)) {
        return childNodes[key]
      }
      else {
        return childNodes[key] = new SubscriptionNode(node)
      }
    })
  }
}

export { State, Props }
