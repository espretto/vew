import { DirectiveType, DirectiveConfig, isFlowControl, PartialConfig, ComponentConfig } from './directive';
import {
  createMountNode, getAttributes, getNodeName, isBlankElement, isElement,
  isEmptyText, isMountNode, isTextBoundary, NodeType, preservesWhitespace,
  replaceNode as replaceNode_
} from './dom/core'
import { TreeWalker } from './dom/treewalker'
import { createExpression, searchExpression } from './expression'
import Registry from './registry'
import { filter, forEach, last } from './util/array'
import { forOwn, hasOwn, keys } from './util/object'
import { camelCase, startsWith } from './util/string'


const reMatchFor = /^\s*(?:([a-z_$][\w$]*)|\[\s*([a-z_$][\w$]*)\s*,\s*([a-z_$][\w$]*)\s*\])\s*of([\s\S]*)$/i

const DIRECTIVE_PREFIX = '--' // TODO: expose option

const EXPRESSION_DELIMITERS: [string, string] = ['${', '}'] // TODO: expose option


/**
 * used to pre-compile templates into a json compatible data structure
 */
export default class Template {

  el: Node
  
  directives: DirectiveConfig[]

  constructor (el: Element) {
    this.el = el
    this.directives = []
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

    this.directives.push({
      type: DirectiveType.TEXT,
      nodePath: tw.path(),
      expression,
    })

    // split text-node where the expression ends
    if (expression.end < text.length) {
      textNode.splitText(expression.end - expression.begin)
      // leave the off-split to the next iteration
    }
  }

  elementState (tw: TreeWalker) {
    const el = tw.node as Element
    const nodeName = getNodeName(el)
    const attrs = getAttributes(el, DIRECTIVE_PREFIX)

    // 1st precedence : slot placeholders with optional default templates
    if (nodeName === 'SLOT') {
      return this.slotState(tw, attrs['NAME'], false)
    }
    else if (hasOwn(attrs, 'SLOT')) {
      return this.slotState(tw, attrs['SLOT'], true)
    }

    // 2nd precedence : flow control instructions
    const flowControls = filter(keys(attrs), isFlowControl)
    switch (flowControls.length) {
      case 0: break
      case 1: return this.flowControlState(tw, flowControls[0] as DirectiveType, attrs[flowControls[0]])
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
    const el = tw.node as Element
    tw.node = this.replaceNode(el, createMountNode(DirectiveType.SLOT))

    if (hasDefaultTemplate) {
      el.removeAttribute(DIRECTIVE_PREFIX + DirectiveType.SLOT)

      this.directives.push({
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
      this.directives.push({
        type: DirectiveType.SLOT,
        name: slotName,
        nodePath: tw.path(),
        template: null
      })
    }
  }

  flowControlState (tw: TreeWalker, directiveType: DirectiveType, value: string) {
    const el = tw.node as Element
    
    el.removeAttribute(DIRECTIVE_PREFIX + directiveType)

    switch (directiveType) {
      case DirectiveType.IF:
        tw.node = this.replaceNode(el, createMountNode(directiveType))

        this.directives.push({
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

        if (tw.node == null || !isMountNode(tw.node, DirectiveType.IF) && !isMountNode(tw.node, DirectiveType.FOR)) {
          throw new Error('directive --elif/--else must be preceded by --if, --elif or --for')
        }

        ;(last(this.directives) as { partials: PartialConfig[] }).partials.push({
          template: new Template(el),
          expression: createExpression(directiveType === DirectiveType.ELIF ? value : 'true')
        })
        break

      case DirectiveType.FOR:
        tw.node = this.replaceNode(el, createMountNode(directiveType))

        const match = value.match(reMatchFor)
        if (!match) throw new Error('malformed --for directive')

        this.directives.push({
          type: DirectiveType.FOR,
          nodePath: tw.path(),
          keyName: match[2],
          valueName: match[1] || match[3],
          partials: [{
            template: new Template(el),
            expression: createExpression(match[4])
          }]
        })
        break

      case DirectiveType.CASE:
        throw new Error('the --case directive can only be used within --switch')

      case DirectiveType.DEFAULT:
        throw new Error('the --default directive can only be used within --switch')

      case DirectiveType.SWITCH:
        const partials: PartialConfig[] = []

        // retrieve element nodes from live NodeList for ulterior removal
        const elements = filter(el.childNodes, isElement)

        forEach(elements, (child: Element) => {
          const attrs = getAttributes(child, DIRECTIVE_PREFIX)

          const flowControls = filter(keys(attrs), isFlowControl)
          switch (flowControls.length) {
            case 0: return
            case 1: break
            default: throw new Error('cannot apply multiple flow controls to a single element')
          }

          const directiveType = flowControls[0] as DirectiveType
          child.removeAttribute(DIRECTIVE_PREFIX + directiveType)

          // TODO: allow only runtime constants in case expressions
          partials.push({
            template: new Template(el.removeChild(child)),
            expression: createExpression(directiveType === DirectiveType.CASE ? attrs[directiveType] : 'true')
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
        
        this.directives.push({
          type: DirectiveType.SWITCH,
          nodePath: tw.path(),
          switched: createExpression(value),
          partials
        })

        break
    }
  }

  componentState (tw: TreeWalker, name: string, attrs: { [attrName: string]: string }) {
    const root = tw.node as Element
    const slots: ComponentConfig["slots"] = {}
    const props: ComponentConfig["props"] = {}

    forOwn(attrs, (attrValue, attrName) => {
      props[camelCase(attrName)] = createExpression(attrValue)
    })

    forEach(filter(root.childNodes, isElement), (el: Element) => {
      const attrs = getAttributes(el, DIRECTIVE_PREFIX)
      
      if (hasOwn(attrs, 'SLOT')) {
        el.removeAttribute(DIRECTIVE_PREFIX + 'SLOT')
        slots[attrs['SLOT']] = new Template(root.removeChild(el))
      }
    })

    if (!isBlankElement(root)) {
      throw new Error('component tag can only contain --slot directives')
    }

    // remove empty text-nodes and comments
    root.innerHTML = ''

    this.directives.push({
      type: DirectiveType.COMPONENT,
      nodePath: tw.path(),
      name,
      slots,
      props
    })
  }

  attributeState (tw: TreeWalker, attrName: string, attrValue: string) {
    const el = tw.node as HTMLElement
    const nodePath = tw.path()
    const expression = createExpression(attrValue)

    if (!expression) {
      throw new Error('prefixed attributes require an expression to evaluate')
    }

    el.removeAttribute(DIRECTIVE_PREFIX + attrName)

    if (attrName === 'CLASS') {
      this.directives.push({
        type: DirectiveType.CLASSNAME,
        nodePath,
        payload: el.className,
        expression
      })
    }
    else if (attrName === 'STYLE') {
      this.directives.push({
        type: DirectiveType.STYLE,
        nodePath,
        payload: el.style.cssText,
        expression
      })
    }
    else if (attrName === 'REF') {
      this.directives.push({
        type: DirectiveType.REFERENCE,
        name: attrValue,
        nodePath
      })
    }
    else if (startsWith(attrName, 'ON-')) {
      this.directives.push({
        type: DirectiveType.LISTENER,
        event: attrName.substring('ON-'.length).toLowerCase(),
        nodePath,
        expression
      })
    }
    else if (startsWith(attrName, 'DATA-')) {
      this.directives.push({
        type: DirectiveType.DATASET,
        payload: attrName.substring('DATA-'.length),
        nodePath,
        expression
      })
    }
    else if (camelCase(attrName) in el) {
      this.directives.push({
        type: DirectiveType.PROPERTY,
        payload: camelCase(attrName),
        nodePath,
        expression
      })
    }
    else {
      this.directives.push({
        type: DirectiveType.ATTRIBUTE,
        payload: attrName,
        nodePath,
        expression
      })
    }
  }
}
