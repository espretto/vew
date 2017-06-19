
import Base from './util/base'
import { every } from './util/array'
import { isEmpty } from './util/string'
import { idNative } from './util/type'
import { document } from './util/global'

export const ELEMENT_NODE = 1
export const TEXT_NODE = 3
export const COMMENT_NODE = 8
export const DOCUMENT_FRAGMENT_NODE = 11

/* -----------------------------------------------------------------------------
 * query
 */
export const getNodeName = document.createElement('custom').nodeName !== 'CUSTOM'
  ? node => node.nodeName.toUpperCase()
  : node => node.nodeName

export function isEmptyTextNode (node) {
  return node.nodeType === TEXT_NODE && isEmpty(node.nodeValue)
}

export function isEmptyElement (node) {
  return !node.children.length && every(node.childNodes, isEmptyTextNode)
}

export function isPlaceholder (node) {
  return node.nodeType === COMMENT_NODE
}

/* -----------------------------------------------------------------------------
 * create
 */
export function Fragment (node) {
  var frag = document.createDocumentFragment()
  if (node) frag.appendChild(node)
  return frag
}

export function Placeholder () {
  return document.createComment('vew')
}

/* -----------------------------------------------------------------------------
 * mutate
 */
export function replaceNode (prev, next) {
  return prev.parentNode.replaceChild(next, prev)
}

export function removeNode (node) {
  return node.parentNode.removeChild(node)
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
 * parse and stringify
 */
export function stringify (node) {
  var container = document.createElement('div')

  switch (node.nodeType) {
    case TEXT_NODE: return node.nodeValue
    case ELEMENT_NODE: return node.outerHTML
    case COMMENT_NODE: /* fall through */
    case DOCUMENT_FRAGMENT_NODE: return (container.appendChild(node), container.innerHTML)
    default: throw new Error(`cannot serialize node type ${node.nodeType}`)
  }
}

export const parse = (function (document) {

  /**
   * Tests for browser support.
   */

  var innerHTMLBug = false;
  var bugTestDiv;
  if (typeof document !== 'undefined') {
    bugTestDiv = document.createElement('div');
    // Setup
    bugTestDiv.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
    // Make sure that link elements get serialized correctly by innerHTML
    // This requires a wrapper element in IE
    innerHTMLBug = !bugTestDiv.getElementsByTagName('link').length;
    bugTestDiv = undefined;
  }

  /**
   * Wrap map from jquery.
   */

  var map =
  { legend: [1, '<fieldset>', '</fieldset>']

  , tr: [2, '<table><tbody>', '</tbody></table>']

  , col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>']

    // for script/link/style tags to work in IE6-8, you have to wrap
    // in a div with a non-whitespace character in front, ha!
  , _default: innerHTMLBug ? [1, 'X<div>', '</div>'] : [0, '', '']
  }

  map.td =
  map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

  map.option =
  map.optgroup = [1, '<select multiple="multiple">', '</select>'];

  map.thead =
  map.tbody =
  map.colgroup =
  map.caption =
  map.tfoot = [1, '<table>', '</table>'];

  map.polyline =
  map.ellipse =
  map.polygon =
  map.circle =
  map.text =
  map.line =
  map.path =
  map.rect =
  map.g = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

  /**
   * Parse `html` and return a DOM Node instance, which could be a TextNode,
   * HTML DOM Node of some kind (<div> for example), or a DocumentFragment
   * instance, depending on the contents of the `html` string.
   *
   * @param {String} html - HTML string to "domify"
   * @param {Document} doc - The `document` instance to create the Node for
   * @return {DOMNode} the TextNode, DOM Node, or DocumentFragment instance
   * @api private
   */
  function parse(html, doc) {
    if ('string' != typeof html) return html

    // default to the global `document` object
    if (!doc) doc = document;

    // tag name
    var m = /<([\w:]+)/.exec(html);
    if (!m) return doc.createTextNode(html);

    html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

    var tag = m[1];

    // body support
    if (tag == 'body') {
      var el = doc.createElement('html');
      el.innerHTML = html;
      return el.removeChild(el.lastChild);
    }

    // wrap map
    var wrap = map[tag] || map._default;
    var depth = wrap[0];
    var prefix = wrap[1];
    var suffix = wrap[2];
    var el = doc.createElement('div');
    el.innerHTML = prefix + html + suffix;
    while (depth--) el = el.lastChild;

    // one element
    if (el.firstChild == el.lastChild) {
      return el.removeChild(el.firstChild);
    }

    // several elements
    var fragment = doc.createDocumentFragment();
    while (el.firstChild) {
      fragment.appendChild(el.removeChild(el.firstChild));
    }

    return fragment;
  }

  return parse

}(document))

/* -----------------------------------------------------------------------------
 * clone
 */
export function clone (node) { return node.cloneNode(true) }
