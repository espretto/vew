

// AVANT TOUTE CHOSE!!!
// write a template compiler function.
// - the output must be serializable to javascript-code (not json).
// - expressions already are serializable, hoist them for deduplication.
// - text nodes pose a problem because they're split, innerHTML will join them again
// - component tags must have a hyphen or colon in their name to
//   reference them by a string. this also enables recursive components.
//   the recursion must be conditional.

import Base from './util/oloo'
import { Error } from './util/global'
import { map, forEach, fold, indexOf } from './util/array'

import Scope from './scope'
import registry from './registry'
import { evaluate, parse as parseExpression } from './expression'
import {
	DocumentFragment
, extractChildNodes
, resolveElement
, setNodeValue
, getNodeName
, Element
, parse as parseHTML
, preorder
, replaceNode
, appendChild
, cloneNode
, DOCUMENT_FRAGMENT
, ELEMENT_NODE
, TEXT_NODE
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
var expressionPrefix = '${', expressionSuffix = '}'

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

    var node = this.template = parseHTML(this.template)
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
          , begin = nodeValue.indexOf(expressionPrefix)

        if (begin > -1) {
          var expression = parseExpression(nodeValue, begin + expressionPrefix.length, expressionSuffix)
            , end = expression.lastIndex + expressionSuffix.length
            , len = nodeValue.length

          if (end <= len) {
            if (DEBUG && expression.errors.length) {
              throw new Error(expression.errors.join('\n'))
            }

            if (begin > 0) {
              if (!node.parentNode) {
                this.template = DocumentFragment(node)
              }
              node = node.splitText(begin)
              nodeIndex += 1
            }

            this.Actions.push(Action.derive({
              compute: evaluate(expression)
            , paths: expression.paths
            , mountPath: nodePath.concat(nodeIndex)
            , effect: setNodeValue
            }))

            if (end < len) {
              if (!node.parentNode) {
                this.template = DocumentFragment(node)
              }
              node.splitText(end-begin)
            }
          }
        }
      }
      else if (nodeType === ELEMENT_NODE) {
        var nodeName = getNodeName(node)
          , CustomComp = registry[nodeName]

        if (CustomComp) {
          var Children = CustomComp.Children.slice()
            , Child = CustomComp.derive({
                // inherit from future parent component
                isTranscluded: this.isTranscluded
              , mountPath: nodePath.concat(nodeIndex)
              , Children: Children
              })

          forEach(node.childNodes, childNode => {
            
            node.removeChild(childNode)

            if (getNodeName(childNode) === 'slot') {

              var defaultSlot = Child.Slots[ childNode.getAttribute('name') ]
              var replaceSlot = Section.derive({
                isTranscluded: true
              , template: extractChildNodes(childNode)
              , mountPath: defaultSlot.mountPath
              }).bootstrap()

              var index = indexOf(Children, defaultSlot)

              // the predefined slot may be no more than a mount path
              if (index < 0) {
                Children.push(replaceSlot)
              }
              else {
                Children[index] = replaceSlot
              }
            }
          })

          this.Children.push(Child)
        }
        else if (nodeName === 'slot') {

          if (DEBUG && !this.Slots) {
            throw new Error('misplaced slot')
          }

          var slotName = node.getAttribute('name')
            , template = extractChildNodes(node)

          if (template) {
            var slot = Section.derive({
              template: template
            , mountPath: nodePath.concat(nodeIndex)
            }).bootstrap()

            this.Children.push(slot)
            this.Slots[slotName] = slot  
          }
          else {
            this.Slots[slotName] = { mountPath: nodePath.concat(nodeIndex) }
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
      , mountNodes = map(this.Children, Child => resolveElement(template, Child.mountPath))

    // retrieve node references before mounting components
    // which may invalidate other mount paths
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

  replace: true

, bootstrap () {
    this.Slots = {}
    return Section.bootstrap.call(this)
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
	}

})

export default Component