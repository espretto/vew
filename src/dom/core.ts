import { isNative } from '../util/type'
import { document } from '../util/global'
import { startsWith } from '../util/string'
import { every } from '../util/array'

export enum NodeType {
  ELEMENT = 1,
  TEXT = 3,
  COMMENT = 8,
  FRAGMENT = 11,
}

const WHITESPACERS: { [key: string]: object } = {}
WHITESPACERS.A =
WHITESPACERS.ABBR =
WHITESPACERS.B =
WHITESPACERS.BDI =
WHITESPACERS.BDO =
WHITESPACERS.BR =
WHITESPACERS.CITE =
WHITESPACERS.CODE =
WHITESPACERS.DATA =
WHITESPACERS.DEL =
WHITESPACERS.DFN =
WHITESPACERS.EM =
WHITESPACERS.I =
WHITESPACERS.INS =
WHITESPACERS.KBD =
WHITESPACERS.MARK =
WHITESPACERS.Q =
WHITESPACERS.S =
WHITESPACERS.SAMP =
WHITESPACERS.SMALL =
WHITESPACERS.SPAN =
WHITESPACERS.STRONG =
WHITESPACERS.SUB =
WHITESPACERS.SUMMARY =
WHITESPACERS.SUP =
WHITESPACERS.TIME =
WHITESPACERS.U =
WHITESPACERS.VAR =
WHITESPACERS.WBR = WHITESPACERS

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
  // @ts-ignore: RegExp#test will cast to string
  return !passNotEmpty.test(textNode.nodeValue)
}

export function isTextBoundary (node?: Node | null) {
  return !node || node.nodeType !== NodeType.TEXT
}

export function isElement (node: Node): node is Element {
  return node.nodeType === NodeType.ELEMENT
}

export function isBlankElement (node: Element) {
  return every(node.childNodes, node =>
    node.nodeType === NodeType.TEXT && isEmptyText(node) ||
    node.nodeType === NodeType.COMMENT
  )
}

export function preservesWhitespace (el: Element) {
  return WHITESPACERS[getNodeName(el)] === WHITESPACERS
}

/* -----------------------------------------------------------------------------
 * query
 */
export const getNodeName: (el: Element) => string =
  document.createElement('custom').nodeName !== 'CUSTOM'
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
  return node.nodeType === NodeType.COMMENT && node.data === type
}

/* -----------------------------------------------------------------------------
 * mutate
 */
export function replaceNode (prev: Node, next: Node) {
  console.assert(prev.parentNode, 'cannot replace root node')
  // @ts-ignore: wait for assertion refinements
  prev.parentNode.replaceChild(next, prev)
  return next
}

export function removeNode (node: Node) {
  console.assert(node.parentNode, 'cannot remove root node')
  // @ts-ignore: wait for assertion refinements
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
export function clone (el: Node): Node {
  return el.cloneNode(true)
}
