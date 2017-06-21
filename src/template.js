
import Base from './util/base'
import Registry from './registry'
import Expression from './expression'
import TreeWalker from './dom/treewalker'
import { hasOwn } from './util/object'
import { forEach, last, map } from './util/array'
import { isEmpty, trim, startsWith, kebabCase } from './util/string'
import { parse, Fragment, Placeholder, TEXT_NODE, ELEMENT_NODE, isPlaceholder,
         isEmptyTextNode, stringify, DOCUMENT_FRAGMENT_NODE,
         removeNode, extractContents, getNodeName } from './dom'

/**
 * CONTINUE:
 * - it is far too early to think about game-engine optimizations
 * - for the moment stuff everything into the attribute handler
 * - keep it simple and mark potential perf issues as [PERF]
 * - consider not to accomodate the no-enum-bug
 */

const reMatchLoop = /^\s*(?:([a-zA-Z_$][\w$]*)|\[\s*([a-zA-Z_$][\w$]*)\s*,\s*([a-zA-Z_$][\w$]*)\s*\])\s*of([\s\S]*)$/

/* -----------------------------------------------------------------------------
 * mutators
 */
import { keys } from './util/object'
import { fold } from './util/array'
import { isObject } from './util/type'

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

  constructor (name, html) {
    this.name = name
    this.mutators = []
    this.components = []
    this.treeWalker = TreeWalker.create()

    var tmpl = parse(html)
    if (tmpl.nodeType !== DOCUMENT_FRAGMENT_NODE) {
      tmpl = Fragment(tmpl)
    }
    
    this.template = tmpl
    this.templateState()
  }

, toJSON () {
    return {
      name: this.name
    , mutators: this.mutators
    , template: stringify(this.template)
    , components: this.components
    }
  }

, replacehold (node) {
    var placeholder = Placeholder()
    node.parentNode.replaceChild(placeholder, node)
    return placeholder
  }

, templateState () {
    var tw = this.treeWalker
      , node = tw.seed(this.template)

    for (; node; node = tw.next()) {
      switch (node.nodeType) {
        case TEXT_NODE: this.textNodeState(); break
        case ELEMENT_NODE: this.elementState(); break
      }
    }
  }

, textNodeState () {
    var tw = this.treeWalker
      , node = tw.node
      , value = node.nodeValue
      , expression

    // remove empty text-nodes
    if (isEmpty(value)) {
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

, elementState () {
    var node = this.treeWalker.node
      , nodeName = getNodeName(node)

    if (Registry.components.has(nodeName)) {
      this.componentState(nodeName)
    }
    else {
      forEach(node.attributes, attr => {
        if (startsWith(attr.nodeName, ATTR_PREFIX)) {
          this.attributeState(attr)
          return false // you cannot mix flow control attributes
          // TODO report error if multiple arguments are found
        }
      })
    }


    /*
    var nodeName = getNodeName(node)
      , attrValue

    if (hasOwn.call(registry, nodeName)) {
      this.componentState(tw, nodeName)
    }
    else if (attrValue = node.getAttribute(ATTR_IS)) {
      this.componentState(tw, attrValue.toUpperCase(), true)
    }
    else if (nodeName === SLOT_NODENAME) {
      this.slotState(tw, node.getAttribute(ATTR_NAME))
    }
    else if (attrValue = node.getAttribute(ATTR_SLOT)) {
      this.slotState(tw, attrValue, true)
    }
    */
  }

, attributeState (attr) {
    var tw = this.treeWalker
      , node = tw.node
      , value = attr.nodeValue
      , name = attr.nodeName.substring(ATTR_PREFIX.length)

    switch (name) {

      case 'class':
        this.mutators.push({
          expression: Expression.parse(value)
        , initial: node.className
        , mutator: MUTATORS.SET_CLASS_NAME
        , target: tw.path()
        })
        
        node.removeAttribute(attr.nodeName)
        break

      case 'style':
        this.mutators.push({
          expression: Expression.parse(value)
        , initial: node.style.cssText
        , mutator: MUTATORS.SET_CSS_TEXT
        , target: tw.path()
        })

        node.removeAttribute(attr.nodeName)
        break

      case 'if':
        // [FIXME] this might be a component-tag
        node.removeAttribute(attr.nodeName)
        tw.node = this.replacehold(node)

        this.mutators.push({
          expressions: [Expression.parse(value)]
        , mutator: MUTATORS.MOUNT_CONDITION
        , target: tw.path()
        , components: [Template.create(name, node)]
        })
        break

      case 'else':
        var expression = Expression.parse('true')
        /* fall through */

      case 'elif':
        if (!this.isPrecededByPlaceholder(node)) {
          throw new Error('[else] and [elif] must be directly preceded by [if], [elif] or [repeat]')
        }

        if (name === 'elif') {
          expression = Expression.parse(value)
        }

        // clean and detach
        tw.prev()
        node.removeAttribute(attr.nodeName)
        removeNode(node)

        // register sub-component with its expression
        var mutator = last(this.mutators)
        mutator.expressions.push(expression)
        mutator.components.push(Template.create(name, node))
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
        node.removeAttribute(attr.nodeName)
        tw.node = this.replacehold(node)

        this.mutators.push({
          expressions: [expression]
        , keyName
        , valName
        , mutator: MUTATORS.MOUNT_LOOP
        , target: tw.path()
        , components: [Template.create(name, node)]
        })
        break

      default:
        throw new Error('not yet implemented attribute handler for: ' + name)
    }
  }

, isPrecededByPlaceholder (node) {
    while (node = node.previousSibling) {
      if (!isEmptyTextNode(node)) {
        return isPlaceholder(node)
      }
    }
    return false
  }

, componentState (componentTag) {
    var tw = this.treeWalker
      , componentNode = tw.node
      , node = componentNode.firstChild
      , slots = []
      , content

    for (; node; node = node.nextSibling) {
      switch (node.nodeType) {

        case TEXT_NODE:
          if (isEmpty(node.nodeValue)) {
            componentNode.removeChild(node)
          }
          break

        case ELEMENT_NODE:
          var slotName

          if (getNodeName(node) === SLOT_NODENAME) {
            slotName = node.getAttribute(ATTR_NAME)
            slots.push(Template.create(slotName, extractContents(componentNode.removeChild(node))))
          }
          else if (slotName = node.getAttribute(ATTR_SLOT)) {
            node.removeAttribute(ATTR_SLOT)
            slots.push(Template.create(slotName, componentNode.removeChild(node)))
          }

          break
      }
    }

    if (content = extractContents(componentNode)) {
      slots.push(Template.create(SLOT_DEFAULT_NAME, content))
    }

    this.components.push({
      tag: componentTag
    , target: tw.path()
    , slots
    })
  }

, slotState (tw, name, byAttr) {
    if (!this.Slots) { // i.e. this.isSlot
      if (DEBUG) throw new Error('slots are not nestable')
    }

    var node = tw.node
      , mountPath = tw.path()
      , template, Slot

    // the element itself is the slot's default template
    if (byAttr) {
      template = node
      template.removeAttribute(ATTR_SLOT)
      this.replacehold(node)
    }
    // the element is the placeholder containing its default template
    else {
      template = gut(node)
    }

    // slots without a default template require one to be transcluded
    if (!template) {
      Slot = { mountPath }
    }
    else {
      Slot = Component.derive({
        isPartial: true
      , template: template
      , mountPath: mountPath
      }).bootstrap(true)

      this.Children.push(Slot)
    }

    this.Slots[name || SLOT_DEFAULT_NAME] = Slot
  }

})

export default Template

/*
<main>
  
  <p>${text}</p>

  <p>${text} suffix</p>

  <p>prefix ${text}</p>

  <p>prefix ${text} suffix</p>

  <p k-if="condition" k-then="create">create if true</p>
    
  <p k-if="condition" k-then="show">show if true</p>

  <p k-if="condition" k-then="attach">attach if true</p>

  <p k-elif="condition" k-then="create">create elif true</p>
    
  <p k-elif="condition" k-then="show">show elif true</p>

  <p k-elif="condition" k-then="attach">attach elif true</p>

  <p k-else k-then="create">create else</p>

  <p k-else k-then="show">show else</p>
  
  <p k-else k-then="attach">attach else</p>

  <ul>
    <li k-repeat="(key,val) of collection">
      item at ${key} is ${val}
    </li>
  </ul>

  <p k-style="color: ${color}">cssText expression<p>

  <p k-style="{ color: color }">css property object<p>

  <p k-class="static ${dynclass}">className expression<p>

  <p k-class="{ trueClass: trueExpression, falseClass: falseExpression }">className array<p>

  <a k-href="url">attribute binding</a>

  <button k-onclick="handler"></button>

</main>

*/

/**
 * rethink the whole architecture
 * - the merge function of the scope has to go through multiple stages
 *   1. resolve all values that steer conditional/repeated rendering to setup/teardown
 *      subscriptions that come/go with it. this needs be a recursive one, think nested conditions.
 *   2. based on the now updated subscriptions limit data-diffing/-cloning to what's been subscribed to.
 *      this may very well trigger multiple dom mutations which have to occur in a specific order:
 *      1. detach subtrees of the form `<div k-if="condition" k-then="detach">`
 *      2. create all components that will go online but do not mount them yet
 *      3. apply all changes that affect offline subtrees and components
 *      4. apply all changes that affect the online document:
 *         - mount components
 *         - re-attach detached subtrees
 *         - apply all other changes
 *
 * rethink the whole architecture
 * - 
 */

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
