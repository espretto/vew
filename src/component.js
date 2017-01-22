
import Base from './util/base'
import Scope from './scope'
import registry from './registry'
import Expression from './expression'
import { getOwn } from './util/object'
import { forEach, map } from './util/array'
import {
  ELEMENT_TYPE
, TEXTNODE_TYPE
, FRAGMENT_TYPE
, clone
, Fragment
, TreeWalker
, resolveNode
, setNodeValue
, parse as parseHTML
} from './dom'

/* -----------------------------------------------------------------------------
 * helper methods
 */
function getComponent (node) {
  return getOwn(registry, node.nodeName.toLowerCase()) ||
         getOwn(registry, node.getAttribute('is'))
}

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
      , Child.isTranscluded ? topScope : component.scope
      , mountNodes[i]
      )
    )
  }

, mount (node) {
    node.parentNode.replaceChild(this.template, node)
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

, ensureParent (textNode) {
    if (!textNode.parentNode) {
      this.template = Fragment(textNode)
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
      , Comp

    if (Comp = getComponent(node)) {
      this.componentState(tw, Comp)
    }

    // stat the node for
    // - is component   or has component attribute
    // - is slot        or has component attribute
    // - is conditional or has component attribute
    // - is iterator    or has component attribute
    // 
    // what other attributes does the node have and
    // - what does each one of them imply?
    // - how are they compatible with each other?
  }

, componentState (tw, Comp) {
    Comp = Comp.derive({
      isTranscluded: this.isTranscluded
    , mountPath: tw.getPath()
    })

    Comp = Comp.finalize(tw.node)

    this.ChildComponents.push(Comp)
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
      Section.mount.call(this, node)
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
    return this
    // TODO: content distribution / transclusion
  }
})