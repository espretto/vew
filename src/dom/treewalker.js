/* @flow */

import { FRAGMENT_NODE, removeNode } from '../dom'

export type NodePath = $ReadOnlyArray<number>

class TreeWalker {

  node: Node

  constructor (node: Node) {
    this.node = node
  }

  next () {
    var node = this.node
    var next = node.firstChild
    if (next) return this.node = next
    do next = node.nextSibling; while (!next && (node = node.parentNode));
    if (next) this.node = next
    return next
  }

  prev () {
    const prev = this.node.previousSibling || this.node.parentNode
    if (prev) this.node = prev
    return prev
  }

  remove () {
    const node = this.node
    this.prev()
    // flowignore: parentNode sure exists
    node.parentNode.removeChild(node)
  }

  path (): NodePath {
    const path: number[] = []
    
    for (var node = this.node; node; node = node.parentNode) {

      for (var prev, breadth = 0; prev = node.previousSibling; breadth += 1) {
        node = prev
      }
      
      path.push(breadth)
    }

    path.pop() // pop root node

    return path
  }
}


function resolve (node: Node, path: NodePath): Node {
  for (var depth = path.length; depth--;) {
    // flowignore: resolve is called before dom injection/manipulation
    node = node.firstChild

    for (var breadth = path[depth]; breadth--;) {
      // flowignore: resolve is called before dom injection/manipulation
      node = node.nextSibling
    }
  }

  return node
}


export { resolve, TreeWalker }
