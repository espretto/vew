/* @flow */

import type { Expression } from './expression'
import type { NodePath } from './dom/treewalker'
import type { Instruction, Partial } from './instruction'

import { InstructionType, isFlowControl } from './instruction'

import Registry from './registry'
import { TreeWalker } from './dom/treewalker'
import { hasOwn, keys, forOwn, mapOwn } from './util/object'
import { startsWith, camelCase } from './util/string'
import { last, filter, forEach } from './util/array'
import { createExpression, searchExpression } from './expression'
import {
  TEXT_NODE,
  ELEMENT_NODE,
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

const EXPRESSION_DELIMITERS = ['${', '}'] // TODO: expose option


/**
 * class Template
 */
class Template {

  el: Node
  
  instructions: Instruction[]

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

    for (let node = tw.node; node; node = tw.next()) {
      switch (node.nodeType) {
        case TEXT_NODE: this.textNodeState(tw); break
        case ELEMENT_NODE: this.elementState(tw); break
      }
    }
  }
  
  textNodeState (tw: TreeWalker) {
    // flowignore: cast to TextNode
    let textNode: Text = tw.node
    const text = textNode.nodeValue

    // flowignore: parentNode is not null
    const allowTrim = !preservesWhitespace(textNode.parentNode)

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

      textNode: Text = tw.next()
    }

    this.instructions.push({
      type: InstructionType.TEXT,
      nodePath: tw.path(),
      expression: expression
    })

    // split text-node where the expression ends
    if (expression.end < text.length) {
      textNode.splitText(expression.end - expression.begin)
      // leave the off-split to the next iteration
    }
  }

  elementState (tw: TreeWalker) {
    // flowignore: cast Node to Element
    const el: Element = tw.node
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
    const el: Element = tw.node
    tw.node = this.replaceNode(el, createMountNode('SLOT'))

    if (hasDefaultTemplate) {
      el.removeAttribute(INSTRUCTION_PREFIX + 'SLOT')

      this.instructions.push({
        type: InstructionType.SLOT,
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
        type: InstructionType.SLOT,
        name: slotName,
        nodePath: tw.path(),
        template: null
      })
    }
  }

  flowControlState (tw: TreeWalker, instructionType: string, value: string) {
    // flowignore: cast Node to Element
    const el: Element = tw.node
    
    el.removeAttribute(INSTRUCTION_PREFIX + instructionType)

    switch (instructionType) {
      case InstructionType.IF:
        tw.node = this.replaceNode(el, createMountNode(instructionType))

        this.instructions.push({
          type: InstructionType.IF,
          nodePath: tw.path(),
          partials: [{
            template: new Template(el),
            expression: createExpression(value)
          }]
        })
        break
      
      case InstructionType.ELIF: /* fall through */
      case InstructionType.ELSE:
        tw.remove()

        if (tw.node == null || !isMountNode(tw.node, 'IF') && !isMountNode(tw.node, 'FOR')) {
          throw new Error('instruction --elif/--else must be preceded by --if, --elif or --for')
        }

        // flowignore: cast Instruction to ConditionalInstruction
        last(this.instructions).partials.push({
          template: new Template(el),
          expression: createExpression(instructionType === InstructionType.ELIF ? value : 'true')
        })
        break

      case InstructionType.FOR:
        tw.node = this.replaceNode(el, createMountNode(instructionType))

        const loop = value.match(reMatchLoop)
        if (!loop) throw new Error('malformed loop expression')

        this.instructions.push({
          type: InstructionType.FOR,
          nodePath: tw.path(),
          keyName: loop[2],
          valueName: loop[1] || loop[3],
          partials: [{
            template: new Template(el),
            expression: createExpression(loop[4])
          }]
        })
        break

      case InstructionType.CASE:
        throw new Error('the --case directive can only be used within --switch')

      case InstructionType.DEFAULT:
        throw new Error('the --default directive can only be used within --switch')

      case InstructionType.SWITCH:
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

          const instructionName = flowControls[0]
          const instructionType = InstructionType[instructionName]
          child.removeAttribute(INSTRUCTION_PREFIX + instructionName)

          // TODO: allow only runtime constants in case expressions
          partials.push({
            template: new Template(el.removeChild(child)),
            expression: createExpression(instructionType === InstructionType.CASE ? attrs[instructionName] : 'true')
          })
        })

        if (!isBlankElement(el)) {
          throw new Error('instruction --switch only allows --case and --default children')
        }
        
        // remove empty text-nodes and comments
        el.innerHTML = ''
        // insert a mount-node for the --case[s], if no --default is given, the mount node is rendered
        el.appendChild(createMountNode(instructionType))
        // point to the mount-node
        tw.next()
        
        this.instructions.push({
          type: InstructionType.SWITCH,
          nodePath: tw.path(),
          switched: createExpression(value),
          partials
        })

        break
    }
  }

  componentState (tw: TreeWalker, name: string, attrs: { [attrName: string]: string }) {
    // flowignore: cast Node to Element
    const root: Element = tw.node
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
      type: InstructionType.COMPONENT,
      nodePath: tw.path(),
      name,
      slots,
      props
    })
  }

  attributeState (tw: TreeWalker, attrName: string, attrValue: string) {
    // flowignore: cast Node to Element
    const elem: HTMLElement = tw.node
    const nodePath = tw.path()
    const expression = createExpression(attrValue)

    if (!expression) {
      throw new Error('prefixed attributes require an expression to evaluate')
    }

    elem.removeAttribute(INSTRUCTION_PREFIX + attrName)

    if (attrName === 'CLASS') {
      this.instructions.push({
        type: InstructionType.CLASSNAME,
        nodePath,
        preset: elem.className,
        expression
      })
    }
    else if (attrName === 'STYLE') {
      this.instructions.push({
        type: InstructionType.STYLE,
        nodePath,
        preset: elem.style.cssText,
        expression
      })
    }
    else if (attrName === 'REF') {
      this.instructions.push({
        type: InstructionType.REFERENCE,
        name: attrValue,
        nodePath
      })
    }
    else if (startsWith(attrName, 'ON-')) {
      this.instructions.push({
        type: InstructionType.LISTENER,
        event: attrName.substring('ON-'.length).toLowerCase(),
        nodePath,
        expression
      })
    }
    else if (startsWith(attrName, 'DATA-')) {
      this.instructions.push({
        type: InstructionType.DATASET,
        name: attrName.substring('DATA-'.length),
        nodePath,
        expression
      })
    }
    else if (camelCase(attrName) in elem) {
      this.instructions.push({
        type: InstructionType.PROPERTY,
        name: camelCase(attrName),
        nodePath,
        expression
      })
    }
    else {
      this.instructions.push({
        type: InstructionType.ATTRIBUTE,
        name: attrName,
        nodePath,
        expression
      })
    }
  }
}

export default Template


/*
  special attribute precedence :

  1. --slot <slot />
  2. --if, --elif, --else, --for, --switch, --case, --default
  3. --is <component />
  4. --class, --style, --value, --on-click, --is-selected, 

  other goodies: --style.width.px="" --class.some-class=""

  template example :

<div --style="style" --class="class" --id="id">
  <h1 --if="condition">if ${name}</h1>
  <h2 --elif="condition">elif</h2>
  <h3 --else="condition">else</h3>
  <div --switch="switch">
    <span --case="1">case 1</span>
    <span --case="2">case 2</span>
    <span --default >case default</span>
  </div>
  <ul --data-whatever="some.value">
    <li --for="item of collection">
      ${item}
    </li>
  </ul>
</div>
*/