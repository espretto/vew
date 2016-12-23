

// AVANT TOUTE CHOSE!!!
// write a template compiler function.
// - the output must be serializable to javascript-code (not json).
// - expressions already are serializable, hoist them for deduplication.
// - text nodes pose a problem because they're split, innerHTML will join them again
// - component tags must have a hyphen or colon in their name to
//   reference them by a string. this also enables recursive components.
//   the recursion must be conditional.

import Base from './util/oloo'
import { Error, Array } from './util/global'
import { map, forEach, fold, indexOf, toArray } from './util/array'

import Scope from './scope'
import registry from './registry'
import { evaluate, parse as parseExpression } from './expression'
import {
  DOCUMENT_FRAGMENT
, ELEMENT_NODE
, TEXT_NODE
  
, DocumentFragment
, Placeholder
, Element

, parse as parseHTML
, isEmptyElement
, resolveElement
, preorder

, extractChildNodes
, setNodeValue
, getNodeName
, replaceNode
, appendChild
, cloneNode
} from './dom'

const Action = Base.derive({

	/*
	compute: <function>
	paths: <array>
	effect: <function>
	mountPath: <array>
	 */

	init (template, scope) {
		this.node = resolveElement(template, this.mountPath)
		forEach(this.paths, path => { scope.subscribe(path, this) })
	}

, call (scope) {
		var args = map(this.paths, path => scope.resolve(path))
		this.effect(this.node, this.compute.apply(null, args))
  }
})


/* -----------------------------------------------------------------------------
 * scan template or template <content>
 *
 * bootstrapping a component is a greedy process. every encounter of
 * a child component will result in a new prototype derived from it.
 * we'll never know in advance which components will be used in a loop
 * and would possibly benefit from this otherwise rather wasteful (memory)
 * behaviour. then again, this just happens once, when bootstrapping a
 * component, not each time it is instantiated.
 */
var prefix = '${', suffix = '}'

function getSlot (node, nodeName) {
  var slotName, slotTemplate

  nodeName || (nodeName = node.nodeName.toLowerCase())

  if (nodeName === 'slot') {
    slotName = node.getAttribute('name') || 'content'
    slotTemplate = extractChildNodes(node)
  }
  else if (slotName = node.getAttribute('slot')) {
    node.removeAttribute('slot')
    slotTemplate = node
  }

  return slotName ? [slotName, slotTemplate] : null
}

const Section = Base.derive({

  // slots are sections that may be passed down to child components in which
  // case they are still held by their direct parent but subscribe to the user's scope.
  isTranscluded: false

, bootstrap () {

    // this.Refs = {}
    // this.Slots = {}
    // this.Events = []
    this.Actions = []
    this.Children = []

    var node = this.template = parseHTML(this['template']) // GCC: export
      , nodeTemp
      , nodeType = node.nodeType
      , nodePath = []
      , nodeIndex = 0

    if (nodeType === DOCUMENT_FRAGMENT) {
      node = node.firstChild
    }

    main: do {
      nodeType = node.nodeType

      if (nodeType === TEXT_NODE) {
        var nodeValue = node.nodeValue
          , begin = nodeValue.indexOf(prefix)

        if (begin > -1) {
          var expr = parseExpression(nodeValue, begin + prefix.length, suffix)
            , end = expr.lastIndex + suffix.length

          if (begin > 0) {
            if (!node.parentNode) {
              this.template = DocumentFragment(node)
            }
            node = node.splitText(begin)
            nodeIndex += 1
          }

          this.Actions.push(Action.derive({
            paths: expr.paths
          , effect: setNodeValue
          , compute: evaluate(expr)
          , mountPath: nodePath.concat(nodeIndex)
          }))

          if (end < nodeValue.length) {
            if (!node.parentNode) {
              this.template = DocumentFragment(node)
            }
            node.splitText(end-begin)
          }
        }
      }
      else if (nodeType === ELEMENT_NODE) {
        var nodeName = getNodeName(node)
          , BootstrappedComponent = registry[nodeName]
          , FinalizedComponent
          , slotArgs

        if (BootstrappedComponent) {
          FinalizedComponent = BootstrappedComponent.derive({
            // inherit from parent component
            isTranscluded: this.isTranscluded
          , mountPath: nodePath.concat(nodeIndex)
          }).finalize(node)

          this.Children.push(FinalizedComponent)
        }
        else if (slotArgs = getSlot(node, nodeName)) {
          var [slotName, slotTemplate] = slotArgs
            , mountPath = nodePath.concat(nodeIndex)

          if (DEBUG && !this.Slots) {
            throw new Error(`misplaced slot: ${slotArgs[0]}`)
          }

          if (!slotTemplate) {
            this.Slots[slotName] = { mountPath }
          }
          else {
            // insert placeholder if the slot's element is the template itself
            if (node === slotTemplate) {
              if (node === this.template) {
                this.template = Placeholder()
              }
              else {
                if (!node.parentNode) {
                  this.template = DocumentFragment(node)
                }

                replaceChild(node, Placeholder())
              }
            }
            
            var Slot = this.Slots[slotName] = Section.derive({
              template: slotTemplate
            , mountPath: mountPath
            }).bootstrap()

            this.Children.push(Slot)
          }
        }
      }

      // pre-order traversal
      if (nodeTemp = node.firstChild) {
        node = nodeTemp
        nodePath.push(nodeIndex)
        nodeIndex = 0
      }
      else do {
        if (nodeTemp = node.nextSibling) {
          node = nodeTemp
          nodeIndex += 1
          continue main
        }
        node = node.parentNode
        nodeIndex = nodePath.pop()
      } while (node)
    } while (node)

    return this
  }

, init (parent, topScope, mountNode) {
    var scope = parent.scope
      , actions = parent.actions
      , children = parent.children
      , template = this.template = this.template.cloneNode(true)
        // retrieve node references before mounting components which may invalidate other mount paths
      , mountNodes = map(this.Children, Child => resolveElement(template, Child.mountPath))


    if (mountNode) this.mount(mountNode)

    forEach(this.Actions, Action => {
      actions.push( Action.new(template, topScope) )
    })

    forEach(this.Children, (Child, i) => {
      children.push( Child.new(parent, Child.isTranscluded ? topScope : scope, mountNodes[i]) )
    })
  }

, mount (node) {
    replaceNode(node, this.template)
  }
})

const Component = Section.derive({

  replace: true // GCC: externs

, bootstrap () {
    this.Slots = {}
    return Section.bootstrap.call(this)
  }

, finalize (mountNode) {
    // copy over from prototype to instance before content distribution (transclusion)
    this.Children = this.Children.slice()

    forEach(toArray(mountNode.children), node => {
      var slotArgs = getSlot(node)

      if (slotArgs) {
        mountNode.removeChild(node)
        this.transclude(slotArgs)
      }
    })

    if (!isEmptyElement(mountNode)) {
      this.transclude(['content', extractChildNodes(mountNode)])
    }

    return this
  }

, transclude ( [slotName, slotTemplate] ) {
    var Slot = this.Slots[slotName]
      , Children = this.Children
      , slotIndex = indexOf(Children, Slot)
      , TranscludedSlot
      
    if (DEBUG && !Slot) {
      throw new Error(`cannot replace unknown slot: "${slotName}"`)
    }

    TranscludedSlot = Section.derive({
      isTranscluded: true
    , template: slotTemplate
    , mountPath: Slot.mountPath
    }).bootstrap()

    if (slotIndex < 0) {
      Children.push(TranscludedSlot)
    }
    else {
      Children[slotIndex] = TranscludedSlot
    }
  }

, init (parent, topScope, mountNode) {
    this.parent = parent
    this.scope = Scope.new()
    // this.refs = {}
    // this.events = []
    this.actions = []
    this.children = []

    Section.init.call(this, this, topScope || this.scope, mountNode)
  }

, mount: function (node) {

    if (this.replace) {
      replaceNode(node, this.template)
    }
    else {
      appendChild(node, this.template)
    }

    return this
  }

, get (path) {
		return this.scope.resolve(path)
	}

, set () {
		var scope = this.scope
		scope.merge.apply(scope, arguments)

    requestAnimationFrame(function () {
      scope.update()
    })
	}

})

Component['new'] = Component.new // GCC: export
Component['mount'] = Component.mount // GCC: export
// Component['get'] = Component.get // GCC: externs
// Component['set'] = Component.set // GCC: externs

export default Component