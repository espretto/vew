
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

function setBooleanProperty (node, value) {
  node[this.initial] = !!value
}

const MUTATORS = {
  SET_NODE_VALUE: 'SET_NODE_VALUE'
, SET_CLASS_NAME: 'SET_CLASS_NAME'
, SET_CSS_TEXT: 'SET_CSS_TEXT'
, SET_BOOLEAN_PROP: 'SET_BOOLEAN_PROPERTY'
, MOUNT_CONDITION: 'MOUNT_CONDITION'
, MOUNT_LOOP: 'MOUNT_LOOP'
}

const ATTR_PREFIX = '--'
const ATTR_IS = '--is'
const ATTR_SLOT = '--slot'
const ATTR_NAME = 'name'
const SLOT_NODENAME = 'SLOT'
const SLOT_DEFAULT_NAME = 'content'
const COMPONENT_NODENAME = 'COMPONENT'

const Template = Base.derive({

  constructor (html, isComponent) {
    this.mutators = []
    this.components = []
    this.template = Fragment(HTML.parse(html))
    this.slots = isComponent ? {} : undefined
    
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

    // remove trailing empty text-nodes
    if ((!node.nextSibling || node.nextSibling.nodeType !== TEXT_NODE) && isEmpty(node)) {
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

      // remove leading empty text-nodes
      if ((!node.previousSibling || node.previousSibling.nodeType !== TEXT_NODE) && isEmpty(node)) {
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
    else if (nodeName === COMPONENT_NODENAME) {
      this.componentState(tw, Expression.parse(node.getAttribute(ATTR_IS)))
    }
    else {
      
      if (Registry.components.has(nodeName)) {
        component = this.componentState(tw, nodeName)
      }

      isControlled = some(node.attributes, attr =>
        startsWith(attr.nodeName, ATTR_PREFIX) &&
        this.attributeState(tw, attr, component)
      )
      
      if (component && !isControlled) {
        this.components.push(component)
      }
    }
  }

, componentState (tw, tag, inset) {
    var root = tw.node
      , node = root.firstChild
      , slots = {}
      , swap
      , contents

    for (; node; node = node.nextSibling) {
      switch (node.nodeType) {

        case TEXT_NODE:
          if ((!node.nextSibling || node.nextSibling.nodeType !== TEXT_NODE) ||
              (!node.previousSibling || node.previousSibling.nodeType !== TEXT_NODE) && isEmpty(node)) {
            removeNode(node)
          }
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

    return { tag, slots, inset: !!inset, target: tw.path() }
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

, attributeState (tw, attr, component) {
    var node = tw.node
      , target = tw.path()
      , attrName = attr.nodeName
      , attrValue = attr.nodeValue
      , keyword = attrName.substring(ATTR_PREFIX.length)

    removeAttr(node, attrName)

    switch (keyword) {

      case 'class':
        this.mutators.push({
          target
        , initial: node.className
        , mutator: MUTATORS.SET_CLASS_NAME
        , expression: Expression.parse(attrValue)
        })
        break

      case 'style':
        this.mutators.push({
          target
        , initial: node.style.cssText
        , mutator: MUTATORS.SET_CSS_TEXT
        , expression: Expression.parse(attrValue)
        })
        break

      case 'prop-checked':
        this.mutators.push({
          target
        , property: 'checked'
        , mutator: MUTATORS.SET_BOOLEAN_PROPERTY
        , expression: Expression.parse(attrValue)
        })
        break

      case 'is':
        this.components.push( this.componentState(tw, Expression.parse(attrValue), true) )
        break

      case 'if':
        tw.node = replaceNode(node, MountNode('if'))

        this.mutators.push({
          target
        , slots: [component || Template.create(node)]
        , mutator: MUTATORS.MOUNT_CONDITION
        , expressions: [Expression.parse(attrValue)]
        })
        break

      case 'repeat':
        tw.node = replaceNode(node, MountNode('repeat'))

        var loop = attrValue.match(reMatchLoop)
        if (!loop) throw new Error('malformed loop expression')

        this.mutators.push({
          target
        , slots: [component || Template.create(node)]
        , valName: loop[1] || loop[3]
        , keyName: loop[2] || ''
        , mutator: MUTATORS.MOUNT_LOOP
        , expressions: [Expression.parse(loop[4])]
        })
        break

      case 'elif':
      case 'else':
        var prev = tw.prev()
        removeNode(node)

        if (!(isMountNode(prev, 'if') || isMountNode(prev, 'repeat'))) {
          throw new Error('elif and else require preceding if, elif or repeat')
          // note: preceding elif-tags will have been removed by now
        }

        var mutator = last(this.mutators)
        mutator.slots.push(component || Template.create(node))
        mutator.expressions.push(Expression.parse(keyword === 'elif' ? attrValue : 'true'))
        break

      default:
        throw new Error('not yet implemented attribute handler for: ' + keyword)
    }

    // whether or not the component is subject to control-flow
    return component && !node.parentNode
  }
})

export default Template

/* test template

<component --is="'dummy'">
  <p>Hello ${name}</p>
</component>

<dummy>
  <p>Hello ${name}</p>
</dummy>

<div --is="dummy">
  <p>Hello ${name}</p>
</div>

<p --if="condition">Hello</p>
<p --elif="another">
  <i --if="condition || another">World</i>
</p>
<p --else>GoodBye</p>
<ul>
  <li --repeat="item of collection">${item.property}</li>
</ul>

 */
