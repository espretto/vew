
import Base from './util/base'
import Registry from './registry'
import Expression from './expression'
import HTML from './dom/html'
import TreeWalker from './dom/treewalker'
import { isObject } from './util/type'
import { hasOwn, keys } from './util/object'
import { some, fold, last, map } from './util/array'
import { startsWith, kebabCase } from './util/string'
import { FRAGMENT_NODE, TEXT_NODE, ELEMENT_NODE,
         Fragment, MountNode, isMountNode,
         removeNode, replaceNode, extractContents,
         getNodeName, removeAttr, isEmpty } from './dom'


const reMatchLoop = /^\s*(?:([a-zA-Z_$][\w$]*)|\[\s*([a-zA-Z_$][\w$]*)\s*,\s*([a-zA-Z_$][\w$]*)\s*\])\s*of([\s\S]*)$/

/* -----------------------------------------------------------------------------
 * mutators
 */
function setNodeValue (node, value) {
  if (node.nodeValue !== value) {
    node.nodeValue = value
  }
}

function setClassName (node, value) {
  var className = !isObject(value)
    ? this.initial + ' ' + value
    : fold(keys(value), this.initial, (className, klass) =>
        value[klass] ? className + ' ' + klass : className)

  if (node.className !== className) {
    node.className = className
  }
}

// [FIXME] cannot set properties "content" and "font-family" because their values contain quotes
function setCssText (node, value) {
  var cssText = !isObject(value)
    ? this.initial + ';' + value
    : fold(keys(value), this.initial, (cssText, prop) =>
        cssText + ';' + kebabCase(prop) + ':' + value[prop])

  if (node.style.cssText !== cssText) {
    node.style.cssText = cssText
  }
}

const MUTATORS = {
  SET_NODE_VALUE: 'SET_NODE_VALUE'
, SET_CLASS_NAME: 'SET_CLASS_NAME'
, SET_CSS_TEXT: 'SET_CSS_TEXT'
, MOUNT_CONDITION: 'MOUNT_CONDITION'
, MOUNT_LOOP: 'MOUNT_LOOP'
}

const ATTR_PREFIX = '--'
const ATTR_SLOT = '--slot'
const ATTR_NAME = 'name'
const SLOT_NODENAME = 'SLOT'
const SLOT_DEFAULT_NAME = 'content'

const Template = Base.derive({

  constructor (html, isComponent) {
    this.mutators = []
    this.components = []
    this.template = Fragment(HTML.parse(html))
    this.slots = isComponent ? {} : null
    
    this.templateState()
  }

  /**
   * sequence diagram
   * 
   * - templateState
   *   - textNodeState
   *   - elementState
   *     - componentState
   *     - slotState
   *     - attributeState
   */
, templateState () {
    var tw = TreeWalker.create()
      , node = tw.seed(this.template)

    for (; node; node = tw.next()) {
      switch (node.nodeType) {
        case TEXT_NODE: this.textNodeState(tw); break
        case ELEMENT_NODE: this.elementState(tw); break
      }
    }
  }

, textNodeState (tw) {
    var node = tw.node
      , value = node.nodeValue
      , expression

    // remove empty text-nodes
    if (!node.nextSibling && isEmpty(node)) {
      tw.prev()
      removeNode(node)
      return
    }

    // parse and cache expression
    expression = Expression.parse(value, ['${', '}'])
    if (!expression) return

    // split text-node where the expression starts
    if (expression.begin > 0) {
      node.splitText(expression.begin)

      if (!node.previousSibling && isEmpty(node)) {
        tw.prev()
        removeNode(node)
      }
      
      node = tw.next()
    }

    // register task
    this.mutators.push({
      expression: expression
    , mutator: MUTATORS.SET_NODE_VALUE
    , target: tw.path()
    })

    // split text-node where the expression ends
    if (expression.end < value.length) {
      node.splitText(expression.end - expression.begin)
      // leave the off-split to the next iteration
    }
  }

, elementState (tw) {
    var node = tw.node
      , nodeName = getNodeName(node)
      , component
      , isControlled

    if (nodeName === SLOT_NODENAME) {
      this.slotState(tw)
    }
    else {
      
      if (Registry.components.has(nodeName)) {
        component = this.componentState(tw, nodeName)
      }

      isControlled = some(node.attributes, attr => {
        if (startsWith(attr.nodeName, ATTR_PREFIX)) {
          return this.attributeState(tw, attr, component)
        }
      })
      
      if (!isControlled) {
        this.components.push(component)
      }
    }
  }

, componentState (tw, tag) {
    var node = tw.node.firstChild
      , slots = {}
      , swap
      , contents

    for (; node; node = node.nextSibling) {
      switch (node.nodeType) {

        case TEXT_NODE:
          if (isEmpty(node)) removeNode(node)
          break

        case ELEMENT_NODE:
          var slotName

          if (getNodeName(node) === SLOT_NODENAME) {
            slotName = node.getAttribute(ATTR_NAME) || SLOT_DEFAULT_NAME
            slots[slotName] = Template.create(extractContents(removeNode(node)))
          }
          else if (slotName = node.getAttribute(ATTR_SLOT)) {
            removeAttr(node, ATTR_SLOT)
            slots[slotName] = Template.create(removeNode(node))
          }
          break
      }
    }

    if (contents = extractContents(root)) {
      slots[SLOT_DEFAULT_NAME] = Template.create(contents)
    }

    return { tag, slots, target: tw.path() }
  }


, slotState (tw) {
    var node = tw.node
      , slotName = node.getAttribute(ATTR_NAME) || SLOT_DEFAULT_NAME
      , contents = extractContents(node)

    this.slots[slotName] = {
      target: tw.path()
    , default: contents ? Template.create(contents) : undefined
    }
  }

, attributeState (tw, attr) {
    var node = tw.node
      , name = attr.nodeName
      , value = attr.nodeValue
      , keyword = name.substring(ATTR_PREFIX.length)

    switch (keyword) {

      case 'class':
        this.mutators.push({
          expression: Expression.parse(value)
        , initial: node.className
        , mutator: MUTATORS.SET_CLASS_NAME
        , target: tw.path()
        })
        
        removeAttr(node, attr.nodeName)
        break

      case 'style':
        this.mutators.push({
          expression: Expression.parse(value)
        , initial: node.style.cssText
        , mutator: MUTATORS.SET_CSS_TEXT
        , target: tw.path()
        })

        removeAttr(node, attr.nodeName)
        break

      case 'if':
        // [FIXME] this might be a component-tag
        removeAttr(node, attr.nodeName)
        tw.node = replaceNode(node, MountNode('if'))

        this.mutators.push({
          expressions: [Expression.parse(value)]
        , mutator: MUTATORS.MOUNT_CONDITION
        , target: tw.path()
        , slots: [Template.create(node)]
        })
        break

      case 'else':
        var expression = Expression.parse('true')
        /* fall through */

      case 'elif':
        var prev = tw.prev()
        if (!isMountNode(prev, 'if') && !isMountNode(prev, 'repeat')) {
          throw new Error('elif and else require preceding if, elif or repeat')
        }

        if (keyword === 'elif') {
          expression = Expression.parse(value)
        }

        // clean and detach
        removeAttr(node, attr.nodeName)
        removeNode(node)

        // register sub-component with its expression
        var mutator = last(this.mutators)
        mutator.expressions.push(expression)
        mutator.slots.push(Template.create(node))
        break

      case 'repeat':
        var loop = value.match(reMatchLoop)
          , keyName, valName, expression

        if (!loop) {
          throw new Error('malformed loop expression')
        }

        valName = loop[1] || loop[3]
        keyName = loop[2] || ''
        expression = Expression.parse(loop[4])

        // [FIXME] this might be a component-tag
        removeAttr(node, attr.nodeName)
        tw.node = replaceNode(node, MountNode('repeat'))

        this.mutators.push({
          expressions: [expression]
        , keyName
        , valName
        , mutator: MUTATORS.MOUNT_LOOP
        , target: tw.path()
        , slots: [Template.create(node)]
        })
        break

      default:
        throw new Error('not yet implemented attribute handler for: ' + keyword)
    }
  }
})

export default Template

/* test template

<p --if="condition">Hello</p>
<p --elif="another">
  <i --if="condition || another">World</i>
</p>
<p --else>GoodBye</p>
<ul>
  <li --repeat="item of collection">${item.property}</li>
</ul>

 */
