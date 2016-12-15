

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
import { evaluate, mangle } from './expression'
import {
	DocumentFragment
, extractChildNodes
, resolveElement
, setNodeValue
, getNodeName
, Element
, parse
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
	DOMEffect: <function>
	path: <array>
	 */

	init (template, scope) {
		this.node = resolveElement(template, this.path)
		forEach(this.paths, path => { scope.subscribe(path, this) })
	}

, call (scope) {
		var args = map(this.paths, path => scope.resolve(path))
		this.DOMEffect(this.node, this.compute.apply(null, args))
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

  // whether or not the section/component is private to its component
  // or a slot replacement provided by the using component. in case of the
  // latter, contained actions will subscribe to the using component's scope.
  isPrivate: true

, bootstrap () {

    // this.Refs = {}
    // this.Slots = {}
    // this.Events = []
    this.Actions = []
    this.Children = []

    var node = this.template = parse(this.template)
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
          , index = nodeValue.indexOf(expressionPrefix)

        // found expression opening
        if (index > -1) {
        
          // if the text does not start with the expression prefix
          // split the text node into two distinct ones
          if (index > 0) {

            // cannot create siblings without a parent
            if (!node.parentNode) {
              this.template = DocumentFragment(node)
            }

            node = node.splitText(index)
            nodeValue = node.nodeValue
            i += 1
          }

          index = nodeValue.indexOf(expressionSuffix, expressionPrefix.length)

          if (index < 0) {
            throw new Error('unterminated expression')
          }
          
          var source = nodeValue.substring(expressionPrefix.length, index)
            , expression = mangle(source)

          this.Actions.push(Action.derive({
            compute: evaluate(expression)
          , paths: expression.paths
          , path: nodePath.concat(nodeIndex)
          , DOMEffect: setNodeValue
          }))

          // if the text does not end with the expression suffix
          // split the text node into two distinct ones
          index += expressionSuffix.length

          if (index < nodeValue.length) {

            // cannot create siblings without a parent
            if (!node.parentNode) {
              this.template = DocumentFragment(node)
            }

            // loop step retrieves node.nextSibling
            node.splitText(index)
          }
        }
      }
      else if (nodeType === ELEMENT_NODE) {
        var nodeName = getNodeName(node)
          , CustomComp = registry[nodeName]

        if (CustomComp) {
          var Child = CustomComp.derive({
            mountPath: nodePath.concat(nodeIndex)
          , Children: CustomComp.Children.slice()
          })

          forEach(node.childNodes, childNode => {
            
            node.removeChild(childNode)

            if (getNodeName(childNode) === 'slot') {
              var defaultSlot = Child.Slots[ childNode.getAttribute('name') ]
                , replaceSlot = Section.derive({
                    isPrivate: false
                  , template: extractChildNodes(childNode)
                  , mountPath: defaultSlot.mountPath
                  }).bootstrap()
                , Children = Child.Children
                , index = indexOf(Children, defaultSlot)

              // the predefined slot may be no more than a mount path
              if (index < 0) {
                Children.push(replaceSlot)
              }
              else {
                Children[i] = replaceSlot
              }
            }
          })

          this.Children.push(Child)
        }
        else if (nodeName === 'slot') {

          if (!this.Slots) {
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

, init (parent, userScope) {
    var parentScope = parent.scope
      , actions = parent.actions
      , children = parent.children
      , template = this.template = this.template.cloneNode(true)

        // retrieve node references before mounting components which may invalidate other mount paths
      , childMountNodes = map(this.Children, Child => resolveElement(template, Child.mountPath))

    forEach(this.Actions, Action => {
      actions.push( Action.new(template, userScope) )
    })

    forEach(this.Children, (Child, i) => {
      children.push( Child.new(parent, Child.isPrivate ? parentScope : userScope).mount(childMountNodes[i]) )
    })
  }

, mount (node) {
    replaceNode(node, this.template)
    return this
  }
})

const Component = /*Section*/Base.derive({

  replace: true

, bootstrap () {
    this.Slots = {}
    return Section.bootstrap.call(this)
  }

, init (parent, userScope) {
    this.parent = parent
    this.scope = Scope.new()
    // this.refs = {}
    // this.events = []
    this.actions = []
    this.children = []

    Section.init.call(this, this, userScope || this.scope)
  }

, mount: function (node) {
  	// TODO: if a Child is mounted and replaces its component-tag
  	// it may occur the parent doesn't provide a parentNode.
  	// settings `this.parent.template = this.template` works but causes chaos!
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