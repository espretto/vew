
import Base from './util/base'
import { every } from './util/array'
import { global, document } from './util/global'

export const ELEMENT_TYPE = 1
export const TEXTNODE_TYPE = 3
export const FRAGMENT_TYPE = 11

/* -----------------------------------------------------------------------------
 * query
 */
function isEmptyTextNode (node) {
  return node.nodeType === TEXTNODE_TYPE && !/\S/.test(node.nodeValue)
}

export function isEmptyElement (node) {
  return !node.children.length && every(node.childNodes, isEmptyTextNode)
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
  return document.createComment('')
}

/* -----------------------------------------------------------------------------
 * mutate
 */
export function replaceNode (oldNode, newNode) {
  return oldNode.parentNode.replaceChild(newNode, oldNode)
}

export function setNodeValue (node, value) {
  node.nodeValue = value
}

export function gut (node) {
  var firstChild = node.firstChild
    , childNodes

  if (firstChild) {

    if (firstChild === node.lastChild) {
      childNodes = node.removeChild(firstChild)
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
 * traverse
 */
export function resolveNode (node, path) {
  var len = path.length
    , i = -1
    , nodeIndex

  if (node.nodeType === ELEMENT_TYPE) {
    i += 1 // skip first node index which is always zero for elements
  }

  while (++i < len) {
    node = node.firstChild
    nodeIndex = path[i]
    
    while (nodeIndex--) {
      node = node.nextSibling
    }
  }
  
  return node
}

export const TreeWalker = Base.derive({

  constructor () {
    this.node = null
    this._path = []
    this._index = 0
  }

, seed (node) {
    if (node.nodeType === FRAGMENT_TYPE) {
      node = node.firstChild
    }
    
    return (this.node = node)
  }

, next () {
    var node = this.node
      , next

    if (next = node.firstChild) {
      this._path.push(this._index)
      this._index = 0
    }
    else {
      do {
        if (next = node.nextSibling) {
          this._index += 1
          break
        }
        node = node.parentNode
        this._index = this._path.pop()
      }
      while (node)
    }

    return (this.node = next)
  }

, getPath () {
    return this._path.concat(this._index)
  }
})

/* -----------------------------------------------------------------------------
 * parse
 */
export const parse = (function (window) {

  var document = window.document

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

}(global))

/* -----------------------------------------------------------------------------
 * clone
 */
export const clone = (function (global) {

  function TextNode (text) {
    return document.createTextNode(text)
  }

  /**
   * cloneNode may rejoin once seperated text-nodes into one.
   */
  var text = TextNode('ab')
    , frag = Fragment(text)
    , rejoinsTextNodes

  text.splitText(1)
  rejoinsTextNodes = frag.childNodes.length !== clone(frag).childNodes.length

  /**
   * clone
   */
  function clone (orig) {
    return orig.cloneNode(true)
  }

  /**
   * clone shim
   */
  function shim (orig) {
    var copy = clone(orig)
      , tw = TreeWalker.create()
      , node = tw.seed(orig)

    for (; node; node = tw.next()) {
      if (node.nodeType === TEXTNODE_TYPE && node.nextSibling) {
        resolveNode(copy, tw.getPath()).splitText(node.nodeValue.length)
      }
    }

    return copy
  }

  return rejoinsTextNodes ? shim : clone

}(global))