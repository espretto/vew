
import Base from './util/base'
import Scope from './scope'
import registry from './registry'
import Expression from './expression'
import { Error } from './util/global'
import { hasOwn } from './util/object'
import { indexOf, forEach, map, mapTo } from './util/array'
import {
  TEXT_NODE
, ELEMENT_NODE
, COMMENT_NODE
, empty
, clone
, Fragment
, Placeholder
, TreeWalker
, resolveNode
, replaceNode
, getNodeName
, setNodeValue
, isEmptyElement
, parse as parseHTML
} from './dom'

const SLOT_DEFAULT_NAME = 'content'
const SLOT_NODENAME = 'SLOT'
const ATTR_IS = `k-is`
const ATTR_SLOT = `k-slot`
const ATTR_NAME = 'name'

/* -----------------------------------------------------------------------------
 * Task
 */
const Task = Base.derive({

  /** prototype variable */
  id: 0

  /** prototype variable */
, args: []

  /*
  abstract paths: array
  abstract effect: function
  abstract compute: function
  abstract mountPath: array
   */

, constructor (node, scope) {
    this.id = Task.id++
    this.node = node
    forEach(this.paths, path => { scope.subscribe(path, this) })
  }

, call (scope) {
    var args = mapTo(this.args, this.paths, path => scope.resolve(path))
    this.effect(this.node, this.compute.apply(null, args))
    args.length = 0
  }
})

/* -----------------------------------------------------------------------------
 * Component
 */
const Component = Base.derive({

  replace: true

, isPartial: false

, isTranscluded: false

, constructor (parent, node, topScope) {
    this.parent = parent
    this.template = clone(this.template)

    // Only custom components create scopes.
    // Partials (if,elif,else,for,slot) subscribe to next component in the hierarchy.
    // Transcluded slots subscribe to the scope of the component that passed them in.
    this.scope = !this.isPartial     ? Scope.create() :
                 !this.isTranscluded ? parent.scope   : topScope

    // resolve mount-paths to actual dom-nodes before mounting child-components,
    // which will mutate the template invalidating mount-paths.
    const nodes = map(this.Children, Child =>
      resolveNode(this.template, Child.mountPath)
    )

    this.tasks = map(this.Tasks, Task =>
      Task.create(resolveNode(this.template, Task.mountPath), this.scope)
    )

    // mount component-tree in pre-order because child-components
    // may want to replace otherwise non-existant elements.
    if (node) this.mount(node)

    this.children = map(this.Children, (Child, i) =>
      Child.create(this, nodes[i], Child.isTranscluded ? topScope : this.scope)
    )
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
   * bootstrap the component
   * - parse and traverse the template
   * - register tasks, events, references, and child-components
   */
, bootstrap (isSlot) {
    if (!isSlot) this.Slots = {}
    this.Tasks = []
    this.Children = []
    this.template = parseHTML(this.template)

    this.templateState()
    return this
  }

, ensureParent (node) {
    if (node === this.template) {
      this.template = Fragment(node)
    }
  }

, placehold (node) {
    if (node === this.template) {
      this.template = Placeholder()
    }
    else {
      // node does have a parent and is thus replaceable
      replaceNode(node, Placeholder())
    }
  }

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
    , mountPath: tw.path()
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
      , nodeName = getNodeName(node)
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
  }

, componentState (tw, tag, byAttr) {
    var node = tw.node
      , Component = registry[tag]

    if (byAttr) {
      node.removeAttribute(ATTR_IS)

      if (Component.replace) {
        if (DEBUG) throw new Error(
          `cannot replace mount-node with attribute "${ATTR_IS}".
           either reconfigure the component or use its custom element.`
        )
      }
    }

    this.Children.push(
      Component.derive({ mountPath: tw.path() })
               .finalize(node)
    )
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
      this.placehold(node)
    }
    // the element is the placeholder containing its default template
    else {
      template = empty(node)
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
   * finalize
   */
, finalize (mountNode) {
    // copy over from prototype to instance before transclusion
    this.Children = this.Children.slice()

    forEach(mountNode.childNodes, node => {
      var attrValue

      if (node.nodeType !== ELEMENT_NODE) {
        return
      }
      else if (getNodeName(node) === SLOT_NODENAME) {
        this.transclude(mountNode.removeChild(node), node.getAttribute(ATTR_NAME))
      }
      else if (attrValue = node.getAttribute(ATTR_SLOT)) {
        this.transclude(mountNode.removeChild(node), attrValue, true)
      }
    })

    if (!isEmptyElement(mountNode)) {
      this.transclude(mountNode)
    }

    return this
  }

, transclude (node, name, byAttr) {
    var Slot = this.Slots[name || SLOT_DEFAULT_NAME]
      , Children = this.Children
      , TranscludedSlot, index, template

    if (!Slot) {
      if (DEBUG) throw new Error(`cannot replace unknown slot: ${name}`)
    }

    if (byAttr) {
      template = node
      template.removeAttribute(ATTR_SLOT)
    }
    else {
      template = empty(node)
    }

    TranscludedSlot = Component.derive({
      isPartial: true
    , isTranscluded: true
    , template: template
    , mountPath: Slot.mountPath
    }).bootstrap(true)

    // slots that require transclusion haven't been added yet.
    index = indexOf(Children, Slot)

    if (index < 0) {
      Children.push(TranscludedSlot)
    }
    else {
      Children[index] = TranscludedSlot
    }
  }
})

export default Component
