
import { fold, every } from './util/array'
import { global, document } from './util/global'


export function setCssText (node, value) {
  node.style.cssText = value
}

/**
 * setNodeValue
 * @param {element} node
 * @param {string} value
 */
export function setNodeValue (node, value) {
  node.nodeValue = value
}

export function setText (node, value) {
  node.textContent = value
}

export function setClass (node, value) {
	node.className = value
}

export function setAttribute (node, name, value) {
	node.setAttribute(name, value)
}

export function getNodeName (node) {
  return node.nodeName.toLowerCase()
}

export const DOCUMENT_FRAGMENT = 11
export const ELEMENT_NODE = 1
export const TEXT_NODE = 3

/**
 * nextElementSibling
 * @param  {Element} node
 * @return {Element}
 */
function nextElementSibling (node) {
	return node.nextElementSibling
}

function nextElementSiblingShim (node) {
	do node = node.nextSibling
	while (node && node.nodeType !== 1)
	return node
}

export const next = 'nextElementSibling' in document.documentElement
	? nextElementSibling
	: nextElementSiblingShim

export function appendChild (parent, child) {
  parent.appendChild(child)
}

export function cloneNode (node, deep) {
  return node.cloneNode(deep)
}

export function isEmptyTextNode (node) {
  return node.nodeType === TEXT_NODE && !/\S/.test(node.nodeValue)
}

export function isEmptyElement (node) {
  return !node.children.length && every(node.childNodes, isEmptyTextNode)
}

/**
 * replaceNode
 * @param  {Element} attached - node to be replaced
 * @param  {Element} loose    - replacement node
 * @return {Element}          replaced node
 */
export function replaceNode (attached, loose) {
  return attached.parentNode.replaceChild(loose, attached)
}

/**
 * Placeholder
 */
export function Placeholder () {
  return document.createComment('')
}

/**
 * Element
 * @param {Element} nodeName - name of DOM elment node
 */
export function Element (nodeName) {
  return document.createElement(nodeName)
}

/**
 * DocumentFragment
 * @param {Element} node
 * @return {DocumentFragment}
 */
export function DocumentFragment (node) {
  var frag = document.createDocumentFragment()

  if (node) {
  	frag.appendChild(node)
  }

  return frag
}

/**
 * traverse DOM tree in pre-order
 * @param  {Element} node - root node
 * @param  {Function} func - iteree function (node, index, indexPath)
 */
    /* do this before calling preorder

ex: preorder(tmpl.nodeType === DOCUMENT_FRAGMENT ? node.firstChild : node)

  if (node.nodeType === DOCUMENT_FRAGMENT) {
    node = node.firstChild
  }
*/
export function preorder (node, func) {
  var path = []
    , i = 0
    , next
    , temp

  main: do {

    next = func(node, i, path)
    if (next) [node, i] = next

    if (temp = node.firstChild) {
      node = temp
      path.push(i)
      i = 0
    }
    else do {
      if (temp = node.nextSibling) {
        node = temp
        i += 1
        continue main
      }
      node = node.parentNode
      i = path.pop()
    } while (node)
  } while (node)
}

/**
 * resolveElement
 * @param  {Element} node
 * @param  {array} path
 * @return {Element}
 */
export function resolveElement (node, path) {
  return node.nodeType === DOCUMENT_FRAGMENT
    ? fold(path, node, (node, i) => node.childNodes[i])
    : fold(path, { childNodes: [node] }, (node, i) => node.childNodes[i])
}

/**
 * extractChildNodes
 * @param  {Element} node
 * @return {Element|DocumentFragement}
 */
export function extractChildNodes (node) {
  var firstChild = node.firstChild
    , childNodes

  if (firstChild) {

    if (firstChild === node.lastChild) {
      childNodes = node.removeChild(firstChild)
    }
    else {
      childNodes = DocumentFragment()
      
      do childNodes.appendChild( node.removeChild(firstChild) )
      while ( firstChild = node.firstChild )
    }
  }
 
  return childNodes
}

// TODO cleanup and es6-ify
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
