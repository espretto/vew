
import { document } from '../util/global'
import { TEXT_NODE, ELEMENT_NODE, COMMENT_NODE, FRAGMENT_NODE,
         Fragment, TextNode, extractContents, removeNode, trim } from '../dom'

/** used instead of globals */
const support = {}

/** used to parse/stringify html */
const wrapElem = document.createElement('div')

/** used to associate tags with the parentNode(s) required for parsing */
const wrapMap = {}

/** used to find the first html-tag (wont skip comments though) */
const reMatchTag = /<(?:[a-zA-Z][^>\/\t\n\f]+)/

/* -----------------------------------------------------------------------------
 * bug detection
 *
 * ignores:
 * - leading whitespace is trimmed when setting innerHTML (IE 6-7)
 * - checkbox controls may loose their checked property (IE 6-7)
 * - cloning events, or not
 */

// IE 6-8: join adjacent text-nodes when cloning
wrapElem.appendChild(TextNode('a'))
wrapElem.appendChild(TextNode('b'))
support.noJoinText = wrapElem.cloneNode(true).childNodes.length !== 1

// IE: link elements do no get serialized
wrapElem.innerHTML = '<link/>'
support.innerHTML = !!wrapElem.firstChild

// IE: tbody elements are inserted automatically
wrapElem.innerHTML = '<table></table>'
support.noAutoTableBody = !wrapElem.lastChild.lastChild

// IE 6-11: defaultValue is not cloned
wrapElem.innerHTML = '<textarea>X</textarea>'
support.cloneDefaultValue = !!wrapElem.cloneNode(true).lastChild.defaultValue

// IE 6-8: unknown elements are not cloneable (TODO verify html5shiv)
wrapElem.innerHTML = '<nav></nav>'
support.cloneUnknown = wrapElem.cloneNode(true).innerHTML === wrapElem.innerHTML

// Safari 5.1, iOS 5.1, Android 4.x, Android 2.3:
// old WebKit doesn't clone checked state correctly in fragments
Fragment(wrapElem)
wrapElem.innerHTML = '<input type="radio" checked="checked" name="name"/>'
support.cloneChecked = !!wrapElem.cloneNode(true).cloneNode(true).lastChild.checked
removeNode(wrapElem)

/* -----------------------------------------------------------------------------
 * wrapper specs
 */
wrapMap.$DEFAULT = support.innerHTML ? [1, 'X<div>', '</div>'] : [0, '', '']

// html 
wrapMap.AREA     = [1, '<map>', '</map>']
wrapMap.COL      = [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>']
wrapMap.LEGEND   = [1, '<fieldset>', '</fieldset>']
wrapMap.OPTION   =
wrapMap.OPTGROUP = [1, '<select multiple="multiple">', '</select>']
wrapMap.PARAM    = [1, '<object>', '</object>']
wrapMap.TD       =
wrapMap.TH       = [3, '<table><tbody><tr>', '</tr></tbody></table>']
wrapMap.TR       = [2, '<table><tbody>', '</tbody></table>']
wrapMap.TBODY    =
wrapMap.THEAD    =
wrapMap.TFOOT    =
wrapMap.CAPTION  =
wrapMap.COLGROUP = [1, '<table>', '</table>']


// svg
wrapMap.CIRCLE   =
wrapMap.ELLIPSE  =
wrapMap.G        = 
wrapMap.LINE     =
wrapMap.PATH     =
wrapMap.POLYGON  =
wrapMap.POLYLINE =
wrapMap.RECT     =
wrapMap.TEXT     = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>']

// TODO mathml

/* -----------------------------------------------------------------------------
 * main
 */
export default {

  support
  
  /** @static */
, parse (html) {
    if (html.nodeType) return html

    var tagMatch = html.match(reMatchTag)
      , tag, wrap, node, depth

    if (!tagMatch) return TextNode(html)

    tag = tagMatch[0].substring(1).toUpperCase()
    wrap = wrapMap[tag] || wrapMap.$DEFAULT
    depth = wrap[0]
    node = wrapElem
    node.innerHTML = wrap[1] + trim(html) + wrap[2]

    while (depth--) node = node.lastChild

    return extractContents(node)
  }

  /** @static */
, stringify (node) {
    switch (node.nodeType) {

      case TEXT_NODE:
        return node.nodeValue

      case ELEMENT_NODE:
        return node.outerHTML

      case COMMENT_NODE:
        /* fall through */

      case FRAGMENT_NODE:
        wrapElem.innerHTML = ''
        wrapElem.appendChild(node)
        return wrapElem.innerHTML

      default:
        throw new Error(`cannot serialize node type ${node.nodeType}`)
    }
  }
}
