import type { Expression } from './expression'
import type { Directive, Partial } from './directive'

import { DirectiveType, isFlowControl } from './directive';

import Registry from './registry'
import { TreeWalker } from './dom/treewalker'
import { hasOwn, keys, forOwn, mapOwn } from './util/object'
import { startsWith, camelCase } from './util/string'
import { last, filter, forEach } from './util/array'
import { createExpression, searchExpression } from './expression'
import {
  NodeType,
  isElement,
  isEmptyText,
  isMountNode,
  isBlankElement,
  isTextBoundary,
  getNodeName,
  getAttributes,
  createMountNode,
  preservesWhitespace,
  replaceNode as replaceNode_
} from './dom/core'


const reMatchLoop = /^\s*(?:([a-z_$][\w$]*)|\[\s*([a-z_$][\w$]*)\s*,\s*([a-z_$][\w$]*)\s*\])\s*of([\s\S]*)$/i

const INSTRUCTION_PREFIX = '--' // TODO: expose option

const EXPRESSION_DELIMITERS: [string, string] = ['${', '}'] // TODO: expose option


/**
 * class Template
 */
export default class Template {

  el: Node
  
  instructions: Array<Directive>

  constructor (el: Element) {
    this.el = el
    this.instructions = []
    this.templateState()
  }

  replaceNode (prev: Node, next: Node) {
    return prev.parentNode ? replaceNode_(prev, next) : (this.el = next)
  }

  templateState () {
    const tw = new TreeWalker(this.el)

    for (let node: Node | undefined = tw.node; node; node = tw.next()) {
      switch (node.nodeType) {
        case NodeType.TEXT: this.textNodeState(tw); break
        case NodeType.ELEMENT: this.elementState(tw); break
      }
    }
  }
  
  textNodeState (tw: TreeWalker) {
    // flowignore: cast to TextNode
    let textNode = tw.node as Text
    const text = textNode.nodeValue as string
    const allowTrim = !preservesWhitespace(textNode.parentNode as Element)

    // remove [trailing] empty text-nodes
    if (allowTrim && isEmptyText(textNode) && isTextBoundary(textNode.nextSibling)) {
      return tw.remove()
    }

    // parse expression
    const expression = searchExpression(text, EXPRESSION_DELIMITERS)
    if (!expression) return

    // split text-node where the expression begins
    if (expression.begin > 0) {
      textNode.splitText(expression.begin)

      // remove leading empty text-nodes
      if (allowTrim && isEmptyText(textNode) && isTextBoundary(textNode.previousSibling)) {
        tw.remove()
      }

      textNode = tw.next() as Text
    }

    this.instructions.push({
      type: DirectiveType.TEXT,
      nodePath: tw.path(),
      expression: expression,
    })

    // split text-node where the expression ends
    if (expression.end < text.length) {
      textNode.splitText(expression.end - expression.begin)
      // leave the off-split to the next iteration
    }
  }

  elementState (tw: TreeWalker) {
    // flowignore: cast Node to Element
    const el = tw.node as Element
    const nodeName = getNodeName(el)
    const attrs = getAttributes(el, INSTRUCTION_PREFIX)

    // 1st precedence : slot placeholders with optional default templates
    if (nodeName === 'SLOT') {
      return this.slotState(tw, attrs['NAME'], false)
    }
    else if (hasOwn(attrs, 'SLOT')) {
      return this.slotState(tw, attrs['SLOT'], true)
    }

    // 2nd precedence : flow control instructions
    const flowControls: string[] = filter(keys(attrs), isFlowControl)
    switch (flowControls.length) {
      case 0: break
      case 1: return this.flowControlState(tw, flowControls[0], attrs[flowControls[0]])
      default: throw new Error('cannot apply multiple flow controls to a single element')
    }

    // 3rd precedence : component tags <component/> or --is="nameExpression"
    // TODO: handle component arguments and component-level event listeners
    if (hasOwn(Registry, nodeName)) {
      return this.componentState(tw, nodeName, attrs)
    }
    else if (hasOwn(attrs, 'IS')) {
      throw new Error('not yet implemented (scheduled for router outlet)')
    }

    // 4th precedence : simple class-, style- & attribute-instructions
    // --class, --style, --attr, --hyphen-ized, --data-property
    forOwn(attrs, (attrValue, attrName) => {
      this.attributeState(tw, attrName, attrValue)
    })
  }

  slotState (tw: TreeWalker, slotName: string, hasDefaultTemplate: boolean) {
    // flowignore: cast Node to Element
    const el = tw.node as Element
    tw.node = this.replaceNode(el, createMountNode('SLOT'))

    if (hasDefaultTemplate) {
      el.removeAttribute(INSTRUCTION_PREFIX + 'SLOT')

      this.instructions.push({
        type: DirectiveType.SLOT,
        name: slotName,
        nodePath: tw.path(),
        template: new Template(el)
      })
    }
    else if (!isBlankElement(el)) {
      throw new Error('in order to provide a default template, do not use ' +
        'the <slot> tag but the --slot attribute on the template\'s root node')
    }
    else {
      this.instructions.push({
        type: DirectiveType.SLOT,
        name: slotName,
        nodePath: tw.path(),
        template: null
      })
    }
  }

  flowControlState (tw: TreeWalker, directiveType: string, value: string) {
    // flowignore: cast Node to Element
    const el = tw.node as Element
    
    el.removeAttribute(INSTRUCTION_PREFIX + directiveType)

    switch (directiveType) {
      case DirectiveType.IF:
        tw.node = this.replaceNode(el, createMountNode(directiveType))

        this.instructions.push({
          type: DirectiveType.IF,
          nodePath: tw.path(),
          partials: [{
            template: new Template(el),
            expression: createExpression(value)
          }]
        })
        break
      
      case DirectiveType.ELIF: /* fall through */
      case DirectiveType.ELSE:
        tw.remove()

        if (tw.node == null || !isMountNode(tw.node, DirectiveType.IF) && !isMountNode(tw.node, DirectiveType.REPEAT)) {
          throw new Error('instruction --elif/--else must be preceded by --if, --elif or --for')
        }

        // flowignore: cast Directive to ConditionalDirective
        ;(last(this.instructions) as ConditionalDirective | RepeatDirective).partials.push({
          template: new Template(el),
          expression: createExpression(directiveType === DirectiveType.ELIF ? value : 'true')
        })
        break

      case DirectiveType.REPEAT:
        tw.node = this.replaceNode(el, createMountNode(directiveType))

        const loop = value.match(reMatchLoop)
        if (!loop) throw new Error('malformed loop expression')

        this.instructions.push({
          type: DirectiveType.REPEAT,
          nodePath: tw.path(),
          keyName: loop[2],
          valueName: loop[1] || loop[3],
          partials: [{
            template: new Template(el),
            expression: createExpression(loop[4])
          }]
        })
        break

      case DirectiveType.CASE:
        throw new Error('the --case directive can only be used within --switch')

      case DirectiveType.DEFAULT:
        throw new Error('the --default directive can only be used within --switch')

      case DirectiveType.SWITCH:
        const partials: Partial[] = []

        // retrieve element nodes from live NodeList for ulterior removal
        const elements = filter(el.childNodes, isElement)

        // flowignore: cast Node to Element
        forEach(elements, (child: Element) => {
          const attrs = getAttributes(child, INSTRUCTION_PREFIX)

          const flowControls = filter(keys(attrs), isFlowControl)
          switch (flowControls.length) {
            case 0: return
            case 1: break
            default: throw new Error('cannot apply multiple flow controls to a single element')
          }

          const directiveName = flowControls[0]
          const directiveType = DirectiveType[directiveName]
          child.removeAttribute(INSTRUCTION_PREFIX + directiveName)

          // TODO: allow only runtime constants in case expressions
          partials.push({
            template: new Template(el.removeChild(child)),
            expression: createExpression(directiveType === DirectiveType.CASE ? attrs[directiveName] : 'true')
          })
        })

        if (!isBlankElement(el)) {
          throw new Error('instruction --switch only allows --case and --default children')
        }
        
        // remove empty text-nodes and comments
        el.innerHTML = ''
        // insert a mount-node for the --case[s], if no --default is given, the mount node is rendered
        el.appendChild(createMountNode(directiveType))
        // point to the mount-node
        tw.next()
        
        this.instructions.push({
          type: DirectiveType.SWITCH,
          nodePath: tw.path(),
          switched: createExpression(value),
          partials
        })

        break
    }
  }

  componentState (tw: TreeWalker, name: string, attrs: { [attrName: string]: string }) {
    // flowignore: cast Node to Element
    const root = tw.node as Element
    const slots: { [name: string]: Template } = {}
    const props: { [prop: string]: Expression } = {}

    forOwn(attrs, (attrValue, attrName) => {
      props[camelCase(attrName)] = createExpression(attrValue)
    })

    // retrieve element nodes from live NodeList for ulterior removal
    const elements = filter(root.childNodes, isElement)
    
    // flowignore: cast Node to Element
    forEach(elements, (el: Element) => {
      const attrs = getAttributes(el, INSTRUCTION_PREFIX)
      
      if (hasOwn(attrs, 'SLOT')) {
        el.removeAttribute(INSTRUCTION_PREFIX + 'SLOT')
        slots[attrs['SLOT']] = new Template(root.removeChild(el))
      }
    })

    if (!isBlankElement(root)) {
      throw new Error('component tag can only contain --slot directives')
    }

    // remove empty text-nodes and comments
    root.innerHTML = ''

    this.instructions.push({
      type: DirectiveType.COMPONENT,
      nodePath: tw.path(),
      name,
      slots,
      props
    })
  }

  attributeState (tw: TreeWalker, attrName: string, attrValue: string) {
    // flowignore: cast Node to Element
    const elem = tw.node as HTMLElement
    const nodePath = tw.path()
    const expression = createExpression(attrValue)

    if (!expression) {
      throw new Error('prefixed attributes require an expression to evaluate')
    }

    elem.removeAttribute(INSTRUCTION_PREFIX + attrName)

    if (attrName === 'CLASS') {
      this.instructions.push({
        type: DirectiveType.CLASSNAME,
        nodePath,
        preset: elem.className,
        expression
      })
    }
    else if (attrName === 'STYLE') {
      this.instructions.push({
        type: DirectiveType.STYLE,
        nodePath,
        preset: elem.style.cssText,
        expression
      })
    }
    else if (attrName === 'REF') {
      this.instructions.push({
        type: DirectiveType.REFERENCE,
        name: attrValue,
        nodePath
      })
    }
    else if (startsWith(attrName, 'ON-')) {
      this.instructions.push({
        type: DirectiveType.LISTENER,
        event: attrName.substring('ON-'.length).toLowerCase(),
        nodePath,
        expression
      })
    }
    else if (startsWith(attrName, 'DATA-')) {
      this.instructions.push({
        type: DirectiveType.DATASET,
        name: attrName.substring('DATA-'.length),
        nodePath,
        expression
      })
    }
    else if (camelCase(attrName) in elem) {
      this.instructions.push({
        type: DirectiveType.PROPERTY,
        name: camelCase(attrName),
        nodePath,
        expression
      })
    }
    else {
      this.instructions.push({
        type: DirectiveType.ATTRIBUTE,
        name: attrName,
        nodePath,
        expression
      })
    }
  }
}
