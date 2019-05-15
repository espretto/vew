/* @flow */

import { isNative } from './util/type'
import { document } from './util/global'
import { startsWith } from './util/string'
import { every } from './util/array'

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
export function trim (html: string) {
  return html.replace(reTrimLeft, '').replace(reTrimRight, '')
}

/**
 * detect empty text-nodes
 */
export function isEmptyText (textNode: Node | Text) {
  return !passNotEmpty.test(textNode.nodeValue)
}

export function isTextBoundary (node: ?Node) {
  return !node || node.nodeType !== TEXT_NODE
}

export function isBlankElement (node: Element) {
  return every(node.childNodes, node =>
    node.nodeType === TEXT_NODE && isEmptyText(node) ||
    node.nodeType === COMMENT_NODE
  )
}

/* -----------------------------------------------------------------------------
 * query
 */
export const getNodeName: Element => string = document.createElement('custom').nodeName !== 'CUSTOM'
  ? node => node.nodeName.toUpperCase()
  : node => node.nodeName

/**
 * retrieve special attributes
 * this should be fast
 */
export function getAttributes (el: Element, prefix: string): { [attrName: string]: string } {
  const result = {}
  const attributes = el.attributes
  const len = attributes.length
  const offset = prefix.length

  for (let attr, i = -1; ++i < len;) {
    attr = attributes[i]

    if (startsWith(attr.nodeName, prefix)) {
      result[attr.nodeName.substring(offset).toUpperCase()] = attr.nodeValue
    }
  }

  return result
}

/* -----------------------------------------------------------------------------
 * create
 */
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

export function createFragment (node?: Node): DocumentFragment {
  const frag = document.createDocumentFragment()
  if (node) frag.appendChild(node)
  return frag
}

export function createMountNode (type: string): Comment {
  return document.createComment(type)
}

export function isMountNode (node: Node & { data?: string }, type: string) {
  return node.nodeType === COMMENT_NODE && node.data === type
}

/* -----------------------------------------------------------------------------
 * mutate
 */
export function replaceNode (prev: Node, next: Node) {
  console.assert(prev.parentNode, 'cannot replace root node')
  // flowignore: wait for assertion refinements
  prev.parentNode.replaceChild(next, prev)
  return next
}

export function removeNode (node: Node) {
  console.assert(node.parentNode, 'cannot remove root node')
  // flowignore: wait for assertion refinements
  return node.parentNode.removeChild(node)
}

/** see: https://stackoverflow.com/a/22966637 */
function nativeExtractContents (node: Node): DocumentFragment {
  const range = document.createRange()
  range.selectNodeContents(node)
  const frag = range.extractContents()
  range.detach() // JIT: legacy cleanup
  return frag
}

function customExtractContents (node: Node): DocumentFragment {
  const frag = createFragment()
  for (let childNode; childNode = node.firstChild;) {
    frag.appendChild(node.removeChild(childNode))
  }
  return frag
}

export const extractContents = isNative(document.createRange)
  ? nativeExtractContents
  : customExtractContents

/* -----------------------------------------------------------------------------
 * clone
 */
export function clone (node: Node) {
  return node.cloneNode(true)
}
