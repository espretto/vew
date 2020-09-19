import { removeNode } from './core'

export type NodePath = Readonly<number[]>;

export class TreeWalker {

  node: Node

  uncles: Node[]

  constructor (node: Node) {
    this.node = node
    this.uncles = []
  }

  next () {
    const child = this.node.firstChild
    const sibling = this.node.nextSibling
    if (child && sibling) this.uncles.push(sibling)
    // @ts-ignore: calling .next() on the null node should throw
    return this.node = child || sibling || this.uncles.pop()
  }

  prev () {
    const parent = this.node.parentNode
    const sibling = this.node.previousSibling
    if (!sibling && parent && parent.nextSibling) this.uncles.pop()
    // @ts-ignore: calling .prev() on the null node should throw
    return this.node = sibling || parent
  }

  remove () {
    const node = this.node
    this.prev()
    removeNode(node)
  }

  path (): NodePath {
    const path: number[] = []
    
    // @ts-ignore: node is never null in loop body
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


export function resolve (node: Node, path: NodePath): Node {
  for (var depth = path.length; depth--;) {
    // @ts-ignore: child exists
    node = node.firstChild

    for (var breadth = path[depth]; breadth--;) {
      // @ts-ignore: sibling exists
      node = node.nextSibling
    }
  }

  return node
}
