/* @flow */

import { isNative } from './util/type'
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
export function trim (html: string) {
  return html.replace(reTrimLeft, '').replace(reTrimRight, '')
}

/**
 * detect empty text-nodes
 */
export function isEmptyText (textNode: Text) {
  return !passNotEmpty.test(textNode.nodeValue)
}

export function isTextBoundary (node?: Node) {
  return !node || node.nodeType !== TEXT_NODE
}

/* -----------------------------------------------------------------------------
 * query
 */
export const getNodeName: Element => string = document.createElement('custom').nodeName !== 'CUSTOM'
  ? node => node.nodeName.toUpperCase()
  : node => node.nodeName

/* -----------------------------------------------------------------------------
 * create
 */
export function TextNode (text: string): Text {
  return document.createTextNode(text)
}

export function Fragment (node?: Node): DocumentFragment {
  const frag = document.createDocumentFragment()
  if (node) frag.appendChild(node)
  return frag
}

export function MountNode (type: string): Comment {
  return document.createComment(type)
}

export function isMountNode (node: Node & { data?: string }, type: string) {
  return node.nodeType === COMMENT_NODE && node.data === type
}

/* -----------------------------------------------------------------------------
 * mutate
 */
export function replaceNode (prev: Node, next: Node) {
  console.assert(prev.parentNode, 'cannot remove root node')
  // flowignore: wait for assertion refinements
  prev.parentNode.replaceChild(next, prev)
  return next
}

export function removeNode (node: Node) {
  console.assert(node.parentNode, 'cannot remove root node')
  // flowignore: wait for assertion refinements
  return node.parentNode.removeChild(node)
}

export function removeAttr (node: Element, name: string) {
  node.removeAttribute(name)
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
  const frag = Fragment()
  while (node.firstChild) {
    frag.appendChild(node.removeChild(node.firstChild))
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
