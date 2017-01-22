
import Base from './util/base'
import Scope from './scope'
import registry from './registry'
import Expression from './expression'
import { Error } from './util/global'
import { hasOwn } from './util/object'
import { toArray, indexOf, forEach, map } from './util/array'
import {
  ELEMENT_TYPE
, TEXTNODE_TYPE
, FRAGMENT_TYPE
, gut
, clone
, Fragment
, Placeholder
, TreeWalker
, resolveNode
, replaceNode
, setNodeValue
, isEmptyElement
, parse as parseHTML
} from './dom'

const DEFAULT_SLOT_NAME = 'content'
const SLOT_NODENAME = 'SLOT'
const IS_ATTR = 'k-is'
const SLOT_ATTR = 'k-slot'
const NAME_ATTR = 'name'

/* -----------------------------------------------------------------------------
 * Task
 */
const Task = Base.derive({

  /*
  abstract paths: array
  abstract effect: function
  abstract compute: function
  abstract mountPath: array
   */

  constructor (node, scope) {
    this.node = node
    forEach(this.paths, path => { scope.subscribe(path, this) })
  }

, call (scope) {
    var args = map(this.paths, path => scope.resolve(path))
    this.effect(this.node, this.compute.apply(null, args))
  }
})

/* -----------------------------------------------------------------------------
 * Section
 *
 * cirlce-ellipse problem
 * ----------------------
 * - components (ellipses) are more general than sections
 * - sections (circles) should thus inherit from components
 * - sections however have less capabilities and certain constraints which
 *   contradicts the notion of inheritance, noteably the "extends" keyword
 * - sections must have a parent component
 * - sections do not have a scope but subscribe to their parent's scope
 *
 * solution: ?
 */
const Section = Base.derive({

  /**
   * whether or not the section represents an argument-slot
   * or a child-section thereof.
   */
  isTranscluded: false

, constructor (component, topScope, mountNode) {
    this.scope = component.scope
    this.template = clone(this.template)
    
    // resolve node-paths before mounting/mutating the template
    const mountNodes = map(this.ChildComponents, Child =>
      resolveNode(this.template, Child.mountPath)
    )

    this.tasks = map(this.Tasks, Task =>
      Task.create(resolveNode(this.template, Task.mountPath), topScope)
    )
    
    // mount component tree "inorder" because child-components
    // may replace otherwise non-existant elements
    if (mountNode) {
      this.mount(mountNode)
    }

    this.childComponents = map(this.ChildComponents, (Child, i) =>
      Child.create(
        component
      , Child.isTranscluded ? topScope : this.scope
      , mountNodes[i]
      )
    )
  }

, mount (node) {
    replaceNode(node, this.template)
  }

  /* ---------------------------------------------------------------------------
   * bootstrap the component
   * - parse and traverse the template
   * - register tasks, events, references, and child-components
   */
, bootstrap () {
    this.Tasks = []
    this.ChildComponents = []
    this.template = parseHTML(this.template)
    this.templateState()
    return this
  }

, ensureParent (node) {
    if (!node.parentNode) {
      this.template = Fragment(node)
    }
  }

, placehold (node) {
    if (node === this.template) {
      this.template = Placeholder()
    }
    else {
      this.ensureParent(node)
      replaceNode(node, Placeholder())
    }
  }

, templateState () {
    var tw = TreeWalker.create()
      , node = tw.seed(this.template)

    for (; node; node = tw.next()) {
      switch (node.nodeType) {
        case TEXTNODE_TYPE: this.textNodeState(tw); break
        case ELEMENT_TYPE: this.elementState(tw); break
      }
    }
  }

, textNodeState (tw) {
    var node = tw.node
      , text = node.nodeValue
      , expr = Expression.parse(text, ['${', '}'])

    if (!expr) return

    // split text-node where the expression starts
    if (expr.begin > 0) {
      this.ensureParent(node)
      node.splitText(expr.begin)
      node = tw.next()
    }

    // register task
    this.Tasks.push(Task.derive({
      paths: expr.paths
    , effect: setNodeValue
    , compute: Expression.evaluate(expr)
    , mountPath: tw.getPath()
    }));

    // split text-node where the expression ends
    if (expr.end < text.length) {
      this.ensureParent(node)
      node.splitText(expr.end - expr.begin)
      // leave the off-split to the next iteration
    }
  }

, elementState (tw) {
    var node = tw.node
      , nodeName = node.nodeName
      , attrValue

    if (hasOwn.call(registry, nodeName)) {
      this.componentState(tw, nodeName)
    }
    else if (attrValue = node.getAttribute(IS_ATTR)) {
      this.componentState(tw, attrValue.toUpperCase(), true)
    }
    else if (nodeName === SLOT_NODENAME) {
      this.slotState(tw, node.getAttribute(NAME_ATTR))
    }
    else if (attrValue = node.getAttribute(SLOT_ATTR)) {
      this.slotState(tw, attrValue, true)
    }
  }

, componentState (tw, tag, hasIsAttr) {
    var node = tw.node
      , Component = registry[tag]

    if (hasIsAttr) {
      node.removeAttribute(IS_ATTR)

      if (Component.replace) {
        if (DEBUG) throw new Error(
          `cannot replace mount-node with attribute "${IS_ATTR}".
           either reconfigure the component or use its custom element.`
        )
      }
    }

    this.ChildComponents.push(Component.derive({
      isTranscluded: this.isTranscluded
    , mountPath: tw.getPath()
    }).finalize(node))
  }

, slotState (tw, name, hasSlotAttr) {
    var node = tw.node
      , mountPath = tw.getPath()
      , template, Slot

    // the element itself is the slot's default template
    if (hasSlotAttr) {
      template = node
      template.removeAttribute(SLOT_ATTR)
      this.placehold(node)
    }
    // the element is the placeholder containing its default template
    else {
      template = gut(node)
    }

    // slots without a default template require one to be transcluded
    if (template) {
      Slot = Section.derive({
        template: template
      , mountPath: mountPath
      }).bootstrap()

      this.ChildComponents.push(Slot)
    }
    else {
      Slot = { mountPath }
    }

    this.Slots[name || DEFAULT_SLOT_NAME] = Slot
  }
})

/* -----------------------------------------------------------------------------
 * Component
 */
export default Section.derive({

  replace: true

, constructor (parent, topScope, mountNode) {
    this.parent = parent
    this.scope = Scope.create()
    Section.constructor.call(this, this, topScope || this.scope, mountNode)
  }

, mount (node) {
    if (this.replace) {
      replaceNode(node, this.template)
    }
    else {
      node.appendChild(this.template)
    }

    return this
  }

  /* ---------------------------------------------------------------------------
   * data access
   */
, get (path) {
    return this.scope.get(path)
  }

, set () {
    Scope.merge.apply(this.scope, arguments)
    setTimeout(() => { this.scope.update() })
  }

  /* ---------------------------------------------------------------------------
   * bootstrap
   */
, bootstrap () {
    this.Slots = {} // TODO: record slots when bootstrapping
    Section.bootstrap.call(this)
  }

  /* ---------------------------------------------------------------------------
   * finalize
   */
, finalize (mountNode) {
    // copy over from prototype to instance before content distribution (transclusion)
    this.ChildComponents = this.ChildComponents.slice()

    forEach(toArray(mountNode.children), node => {
      var attrValue
      
      if (node.nodeName === SLOT_NODENAME) {
        this.transclude(mountNode.removeChild(node), node.getAttribute(NAME_ATTR))
      }
      else if (attrValue = node.getAttribute(SLOT_ATTR)) {
        this.transclude(mountNode.removeChild(node), attrValue, true)
      }
    })

    if (!isEmptyElement(mountNode)) {
      this.transclude(mountNode)
    }

    return this
  }

, transclude (node, name, hasSlotAttr) {
    var Slot = this.Slots[name || DEFAULT_SLOT_NAME]
      , ChildComponents = this.ChildComponents
      , TranscludedSlot, slotIndex, template
      
    if (!Slot) {
      if (DEBUG) throw new Error(`cannot replace unknown slot: ${name}`)
    }

    if (hasSlotAttr) {
      template = node
      template.removeAttribute(SLOT_ATTR)
    }
    else {
      template = gut(node)
    }

    TranscludedSlot = Section.derive({
      isTranscluded: true
    , template: template
    , mountPath: Slot.mountPath
    }).bootstrap()

    slotIndex = indexOf(ChildComponents, Slot)
    
    if (slotIndex < 0) {
      ChildComponents.push(TranscludedSlot)
    }
    else {
      ChildComponents[slotIndex] = TranscludedSlot
    }
  }
})