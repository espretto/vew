
import Base from './util/oloo'
import { Error } from './util/global'
import { map, forEach, fold } from './util/array'

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
, DOCUMENT_FRAGMENT
, ELEMENT_NODE
, TEXT_NODE
} from './dom'

const Action = Base.derive({

	/*
	compute: <function>
	paths: <array>
	DOMEffect: <function>
	mountPath: <array>
	 */

	init (template, scope) {
		this.node = resolveElement(template, this.mountPath)
		forEach(this.paths, path => { scope.subscribe(path, this) })
	}

, call (scope) {
		var args = map(this.paths, path => scope.resolve(path))
		this.DOMEffect(this.node, this.compute.apply(null, args))
  }
})

/* ---------------------------------------------------------------------------
 * scan template or template <content>
 */
var expressionPrefix = '${', expressionSuffix = '}'

/**
 * walk the html structure in pre-order and extract options to
 * - either set up a component prototype
 * - or gather options for a child component
 * 
 * @param  {HTMLElement|DocumentFragment} template - component template or child component content
 * @param  {object} proto    - component prototype
 * @param  {array} nodePath - child component mount path
 * @return {object}
 */
function scanTemplate (template, proto, nodePath) {
  var options =
  { Actions: []
  , Children: []
  , template: template
  , contentPath: undefined
    // options specific to child components
  , mountPath: nodePath
  , Component: proto
  }

  if (!template) return options // empty content

  var node = template
    , nodeType = node.nodeType
    , nodeIndex = 0
    , firstChild

  if (nodeType === DOCUMENT_FRAGMENT) {
    node = node.firstChild
  }

	nodePath = []

  while (node) {
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
          	options.template = DocumentFragment(node)
          }

          node = node.splitText(index)
          nodeValue = node.nodeValue
          nodeIndex += 1
        }

        index = nodeValue.indexOf(expressionSuffix, expressionPrefix.length)

        if (index < 0) {
          throw new Error('unterminated expression')
        }
        
        var source = nodeValue.substring(expressionPrefix.length, index)
        	, expression = mangle(source)

        options.Actions.push(Action.derive({
					compute: evaluate(expression)
				, paths: expression.paths
				, mountPath: nodePath.concat(nodeIndex)
				, DOMEffect: setNodeValue
				}))

        // if the text does not end with the expression suffix
        // split the text node into two distinct ones
        index += expressionSuffix.length

        if (index < nodeValue.length) {

          // cannot create siblings without a parent
          if (!node.parentNode) {
            options.template = DocumentFragment(node)
          }

          // loop step retrieves node.nextSibling
          node.splitText(index)
        }
      }
    }
    else if (nodeType === ELEMENT_NODE) {
    	var nodeName = getNodeName(node)
    		, Component = registry[nodeName]

    	if (Component) {
    		options.Children.push(scanTemplate(
          extractChildNodes(node)
        , Component
    		, nodePath.concat(nodeIndex)
    		))
    	}
    	else if (nodeName === 'content') {
    		options.contentPath = nodePath.concat(nodeIndex)
    	}
    }

    // pre-order traversal
    if (firstChild = node.firstChild) {
      node = node.firstChild
      nodePath.push(nodeIndex)
      nodeIndex = 0
    }
    else {
      while (node && !node.nextSibling) {
        node = node.parentNode
        nodeIndex = nodePath.pop()
      }
      node = node && node.nextSibling
      nodeIndex += 1
    }
  }

  return options
}

const Component = Base.derive({

	replace: true

, template: Element('content')

, bootstrap () {
    var options = scanTemplate(parse(this.template))
    
    this.template = options.template
    this.Actions = options.Actions
    this.Children = options.Children
    this.contentPath = options.contentPath

    return this
  }

, init (parent, content, contentScope) {
    
    // hierarchy link
    this.parent = parent
    parent = this

    var scope = this.scope = Scope.new()
      , actions = this.actions = []
      , children = this.children = []

      // clone template from prototype onto instance
      , template = this.template = this.template.cloneNode(true)

      // retrieve node references before mounting components which may invalidate other mount paths
      , childMountNodes = map(this.Children, options => resolveElement(template, options.mountPath))

    forEach(this.Actions, Action => {
    	actions.push(Action.new(template, scope))
    })

    forEach(this.Children, (options, i) => {
      children.push(options.Component
        .new(parent, options, scope)
        .mount(childMountNodes[i])
      )
    })

    if (content && content.template && this.contentPath) {
      var contentTemplate = content.template.cloneNode(true)
        , contentMountNode = resolveElement(template, this.contentPath)
        , contentChildMountNodes = map(content.Children, options => resolveElement(contentTemplate, options.mountPath))

      forEach(content.Actions, Action => {
        actions.push(Action.new(contentTemplate, contentScope))
      })

      forEach(content.Children, (options, i) => {
        children.push(options.Component
          .new(parent, options, contentScope)
          .mount(contentChildMountNodes[i])
        )
      })

      this.mountContent(contentMountNode, contentTemplate)
    }
    else if (DEBUG && content && (content.template || this.contentPath)) {
      throw new Error('missing <content> placeholder or actual content to replace it.')
    }
  }

, mount: function (node) {

    if (this.replace) {
    	// TODO: if a child is mounted and replaces its component-tag
    	// it may occur the parent doesn't provide a parentNode.
    	// settings `this.parent.template = this.template` works but causes chaos!
    	node.parentNode.replaceChild(this.template, node)
    }
    else {
      node.appendChild(this.template)
    }

    return this
  }

, mountContent: function (node, template) {
    var parentNode = node.parentNode

    if (parentNode) {
      parentNode.replaceChild(template, node)
    }
    else {
      // overrides the "empty" template <content/>
      this.template = template
    }
  }

  /**
   * public api
   */
, get (path) {
		return this.scope.resolve(path)
	}

, set () {
		var scope = this.scope
		scope.merge.apply(scope, arguments)
	}

})

export default Component