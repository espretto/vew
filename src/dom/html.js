/* @flow */

import { getOwn } from '../util/object'
import { document } from '../util/global'
import { TEXT_NODE, ELEMENT_NODE, COMMENT_NODE, FRAGMENT_NODE,
         createFragment, createTextNode, extractContents, removeNode, trim } from './core'

/** bug list */
export const support = {}

/** used to parse/stringify html */
const wrapElem: Element = document.createElement('div')

/** used to associate tags with the parentNode(s) required for parsing */
const wrapMap: { [string]: [number, [string, string]] } = {}

/** used to find the first html-tag (wont skip comments though) */
const reTagName = /<([a-zA-Z][^>\/\t\n\f ]*)/

/* -----------------------------------------------------------------------------
 * bug detection
 *
 * ignores:
 * - leading whitespace is trimmed when setting innerHTML (IE 6-7)
 * - checkbox controls may loose their checked property (IE 6-7)
 * - cloning events, or not
 */

// IE 6-8: join adjacent text-nodes when cloning
wrapElem.appendChild(createTextNode('a'))
wrapElem.appendChild(createTextNode('b'))
support.noJoinText = wrapElem.cloneNode(true).childNodes.length !== 1

// IE: link elements do no get serialized
wrapElem.innerHTML = '<link/>'
support.innerHTML = !!wrapElem.firstChild

// IE: tbody elements are inserted automatically
wrapElem.innerHTML = '<table></table>'
// flowignore: lastChild exists
support.noAutoTableBody = !wrapElem.lastChild.lastChild // @flow : ignore-next-line

// IE 6-11: defaultValue is not cloned
wrapElem.innerHTML = '<textarea>X</textarea>'
// flowignore: lastChild exists
support.cloneDefaultValue = !!wrapElem.cloneNode(true).lastChild.defaultValue

// IE 6-8: unknown elements are not cloneable (TODO verify html5shiv)
wrapElem.innerHTML = '<nav></nav>'
support.cloneUnknown = wrapElem.cloneNode(true).innerHTML === wrapElem.innerHTML

// Safari 5.1, iOS 5.1, Android 4.x, Android 2.3:
// old WebKit doesn't clone checked state correctly in fragments
createFragment(wrapElem)
wrapElem.innerHTML = '<input type="radio" checked="checked" name="name"/>'
// flowignore: lastChild exists
support.cloneChecked = !!wrapElem.cloneNode(true).cloneNode(true).lastChild.checked
removeNode(wrapElem)

/* -----------------------------------------------------------------------------
 * wrapper specs
 */
const wrapMapDefault = support.innerHTML
  ? [1, ['X<div>', '</div>']]
  : [0, ['', '']]

// html 
wrapMap.AREA     = [1, ['<map>', '</map>']]
wrapMap.COL      = [2, ['<table><tbody></tbody><colgroup>', '</colgroup></table>']]
wrapMap.LEGEND   = [1, ['<fieldset>', '</fieldset>']]
wrapMap.OPTION   =
wrapMap.OPTGROUP = [1, ['<select multiple="multiple">', '</select>']]
wrapMap.PARAM    = [1, ['<object>', '</object>']]
wrapMap.TD       =
wrapMap.TH       = [3, ['<table><tbody><tr>', '</tr></tbody></table>']]
wrapMap.TR       = [2, ['<table><tbody>', '</tbody></table>']]
wrapMap.TBODY    =
wrapMap.THEAD    =
wrapMap.TFOOT    =
wrapMap.CAPTION  =
wrapMap.COLGROUP = [1, ['<table>', '</table>']]


// svg
wrapMap.CIRCLE   =
wrapMap.ELLIPSE  =
wrapMap.G        = 
wrapMap.LINE     =
wrapMap.PATH     =
wrapMap.POLYGON  =
wrapMap.POLYLINE =
wrapMap.RECT     =
wrapMap.TEXT     = [1, ['<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>']]

// TODO mathml

function dive (node: Node, depth: number) {
  console.assert(node != null, 'html parser dives too deep')
  // flowignore: lastChild exists
  return depth ? dive(node.lastChild, depth-1) : node
}

/**
 * parse an html string
 */
export function parse (html: string): DocumentFragment {
  html = trim(html)
  const tagMatch = html.match(reTagName)
  if (!tagMatch) return createFragment(createTextNode(html))
  const [depth, wrapper] = getOwn(wrapMap, tagMatch[1].toUpperCase(), wrapMapDefault)
  wrapElem.innerHTML = wrapper.join(html)
  return extractContents(dive(wrapElem, depth))
}

/**
 * stringify an html node-tree
 */
export function stringify (node: Element) {
  switch (node.nodeType) {
    case TEXT_NODE: return node.nodeValue
    case ELEMENT_NODE: return node.outerHTML
    case COMMENT_NODE: /* fall through */
    case FRAGMENT_NODE:
      wrapElem.innerHTML = ''
      wrapElem.appendChild(node)
      return wrapElem.innerHTML
    default:
      throw new Error(`cannot serialize node type ${node.nodeType}`)
  }
}
