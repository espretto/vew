/* @flow */

import { FRAGMENT_NODE } from '../dom'

/**
 * alternative TreeWalker implementation
 *
 * - does not support filters
 * - does not halt when revisiting the root node
 * - can produce and resolve node-paths as integer-arrays
 * - throws on succeeding calls to next() once null was returned
 *
 * TODO
 * - fork native TreeWalker implementation
 * - make it a singleton i.e. implement the stash interface
 */

class Walker {

  node: Node

  constructor (node: Node) {
    if (node.nodeType === FRAGMENT_NODE) {
      if (node.firstChild) this.node = node.firstChild
      else throw new Error('cannot walk an empty fragment')
    }
    else {
      this.node = node
    }
  }

  next () {
    let node = this.node
    let next = node.firstChild

    if (next) return next

    do next = node.nextSibling
    while (!next && (node = node.parentNode));

    if (next) this.node = next

    return next
  }

  prev () {
    const prev = this.node.previousSibling || this.node.parentNode
    if (prev) this.node = prev
    return prev
  }

  path (): number[] {
    var path = [], prev, node, nodeIndex

    for (node = this.node; node; node = node.parentNode) {

      for (nodeIndex = 0; prev = node.previousSibling; nodeIndex += 1) {
        node = prev
      }

      path.push(nodeIndex)
    }

    path.pop()

    return path
  }

  static resolve (node: Node, path: number[]) {
    for (var depth = path.length; depth--;) {
      node = ((node.firstChild: any): Node)

      for (var width = path[depth]; width--;) {
        node = ((node.nextSibling: any): Node)
      }
    }

    return node
  }
}

export default Walker
