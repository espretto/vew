
import { idNative } from './util/type'
import { document } from './util/global'

export const ELEMENT_NODE = 1
export const TEXT_NODE = 3
export const COMMENT_NODE = 8
export const FRAGMENT_NODE = 11

/** used to detect empty html text nodes */
const passNotEmpty = /[^ \t\n\f]/

/** used to trim html */
const reTrimLeft = /^[ \t\n\f]+/

/** used to trim html */
const reTrimRight = /[ \t\n\f]+$/

/**
 * trim html - does not consider &nbsp; as whitespace
 */
export function trim (html) {
  return html.replace(reTrimLeft, '')
             .replace(reTrimRight, '')
}

/**
 * detect empty text-nodes
 */
export function isEmptyText (textNode) {
  return !passNotEmpty.test(textNode.nodeValue)
}

export function isTextBoundary (node) {
  return !node || node.nodeType !== TEXT_NODE
}

/* -----------------------------------------------------------------------------
 * query
 */
export const getNodeName = document.createElement('custom').nodeName !== 'CUSTOM'
  ? node => node.nodeName.toUpperCase()
  : node => node.nodeName

/* -----------------------------------------------------------------------------
 * create
 */
export function TextNode (text) {
  return document.createTextNode(text)
}

export function Fragment (node) {
  if (node && node.nodeType === FRAGMENT_NODE) return node
  const frag = document.createDocumentFragment()
  if (node) frag.appendChild(node)
  return frag
}

export function MountNode (type) {
  return document.createComment(type)
}

export function isMountNode (node, type) {
  return node.nodeType === COMMENT_NODE && node.data === type
}

/* -----------------------------------------------------------------------------
 * mutate
 */
export function replaceNode (prev, next) {
  prev.parentNode.replaceChild(next, prev)
  return next
}

export function removeNode (node) {
  return node.parentNode.removeChild(node)
}

export function removeAttr (node, name) {
  node.removeAttribute(name)
}

const RangeSingleton = idNative(document.createRange) && document.createRange()

export function extractContents (node) {
  var firstChild = node.firstChild
    , childNodes

  if (firstChild) {

    if (firstChild === node.lastChild) {
      childNodes = node.removeChild(firstChild)
    }
    // thx: https://stackoverflow.com/a/22966637
    else if (RangeSingleton) {
      RangeSingleton.selectNodeContents(node)
      childNodes = RangeSingleton.extractContents()
      RangeSingleton.detach() // JIT: free resources (legacy)
    }
    else {
      childNodes = Fragment()

      do childNodes.appendChild( node.removeChild(firstChild) )
      while ( firstChild = node.firstChild );
    }
  }

  return childNodes
}

/* -----------------------------------------------------------------------------
 * clone
 */
export function clone (node) { return node.cloneNode(true) }
