
import Base from '../util/base'

const DOCUMENT_FRAGMENT_NODE = 11

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
export default Base.derive({

  constructor () {
    this.node = null
  }

, seed (node) {
    if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
      node = node.firstChild
    }
    
    return (this.node = node)
  }

, next () {
    var node = this.node
      , next = node.firstChild

    if (!next) {
      while (
        (next = node.nextSibling) === null &&
        (node = node.parentNode)
      );
    }
  
    return (this.node = next)
  }

, prev () {
    var node = this.node
      , prev = node.previousSibling || node.parentNode
    
    return (this.node = prev)
  }
  
, path () {
    var path = [] // note: path is reversed
      , prev, node, nodeIndex
     
    for (node = this.node; node; node = node.parentNode) {
      
      for (nodeIndex = 0; prev = node.previousSibling; nodeIndex += 1) {
        node = prev
      }
      
      path.unshift(nodeIndex)
    }
  
    path.shift()
  
    return path
  }

  /** @static */
, resolve (node, path) {
    var len = path.length
      , i = -1
      , nodeIndex

    while (++i < len) {
      node = node.firstChild
      nodeIndex = path[i]

      while (nodeIndex--) {
        node = node.nextSibling
      }
    }

    return node
  }
})

