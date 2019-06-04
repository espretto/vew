/* @flow */

import type { Expression } from './expression'
import type { NodePath } from './dom/treewalker'
import type { Instruction } from './instruction'

import { InstructionType, isFlowControl } from './instruction'

import Registry from './registry'
import TreeWalker from './dom/treewalker'
import { thisify } from './util/function'
import { isString } from './util/type'
import { hasOwn, keys, forOwn } from './util/object'
import { startsWith, camelCase } from './util/string'
import { some, last, map, filter, forEach } from './util/array'
import { createExpression, searchExpression } from './expression'
import { TEXT_NODE, ELEMENT_NODE, getNodeName, isEmptyText, isBlankElement,
         isMountNode, isElement, isTextBoundary, createMountNode, replaceNode, getAttributes, createFragment } from './dom'

const reMatchLoop = /^\s*(?:([a-z_$][\w$]*)|\[\s*([a-z_$][\w$]*)\s*,\s*([a-z_$][\w$]*)\s*\])\s*of([\s\S]*)$/i

const INSTRUCTION_PREFIX = '--' // TODO: expose option

const EXPRESSION_DELIMITERS = ['${', '}'] // TODO: expose option


/**
 * class Template
 */
class Template {

  el: Element;

  instructions: Instruction[]

  constructor (el: Element) {
    this.el = el
    this.instructions = []
    this.templateState()
  }

  templateState () {
    const tw = new TreeWalker(this.el)
    let frag = createFragment(this.el)

    for (let node = tw.node; node; node = tw.next()) {
      switch (node.nodeType) {
        case TEXT_NODE: this.textNodeState(tw); break
        case ELEMENT_NODE: this.elementState(tw); break
      }
    }

    // flowignore: there sure is a first child
    this.el = frag.removeChild(frag.firstChild)
    frag = null // JIT: avoid memory leak
  }
  
  textNodeState (tw: TreeWalker) {
    // flowignore: cast Node to TextNode
    var textNode: Text = tw.node
    const text = textNode.nodeValue

    // remove [trailing] empty text-nodes
    if (isEmptyText(textNode) && isTextBoundary(textNode.nextSibling)) {
      return tw.remove()
    }

    // parse expression
    const expression = searchExpression(text, EXPRESSION_DELIMITERS)
    if (!expression) return

    // split text-node where the expression begins
    if (expression.begin > 0) {
      textNode.splitText(expression.begin)

      // remove leading empty text-nodes
      // TODO: doesnt seem to effectively remove empty text-nodes
      if (isEmptyText(textNode) && isTextBoundary(textNode.previousSibling)) {
        tw.remove()
      }

      textNode = tw.next()
    }

    this.instructions.push({
      type: InstructionType.NODEVALUE,
      target: tw.path(),
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
    else if (hasOwn.call(attrs, 'SLOT')) {
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
    if (hasOwn.call(Registry.components, nodeName)) {
      this.componentState(tw, nodeName)
    }
    else if (hasOwn.call(attrs, 'IS')) {
      this.componentState(tw, createExpression(attrs['IS']))
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
    tw.node = replaceNode(el, createMountNode('SLOT'))

    if (hasDefaultTemplate) {
      el.removeAttribute(INSTRUCTION_PREFIX + 'SLOT')

      this.instructions.push({
        type: InstructionType.SLOT,
        name: slotName,
        target: tw.path(),
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
        target: tw.path(),
        template: null
      })
    }
  }

  flowControlState (tw: TreeWalker, instName: string, value: string) {
    // flowignore: cast Node to Element
    const el: Element = tw.node
    const target = tw.path()
    const instType = InstructionType[instName]

    el.removeAttribute(INSTRUCTION_PREFIX + instName)

    switch (instType) {
      case InstructionType.IF:
        tw.node = replaceNode(el, createMountNode(instName))

        this.instructions.push({
          type: instType,
          target,
          templates: [new Template(el)],
          expressions: [createExpression(value)]
        })
        break
      
      case InstructionType.ELIF: /* fall through */
      case InstructionType.ELSE:
        tw.remove()

        if (tw.node == null || !isMountNode(tw.node, 'IF') && !isMountNode(tw.node, 'FOR')) {
          throw new Error('instruction --elif/--else must be preceded by --if, --elif or --for')
        }

        // flowignore: cast Instruction to FlowControlInstruction
        const flowControl: FlowControlInstruction = last(this.instructions)
        flowControl.templates.push(new Template(el))
        flowControl.expressions.push(createExpression(instType === InstructionType.ELIF ? value : 'true'))
        break

      case InstructionType.FOR:
        tw.node = replaceNode(el, createMountNode(instName))

        const loop = value.match(reMatchLoop)
        if (!loop) throw new Error('malformed loop expression')

        this.instructions.push({
          type: instType,
          target,
          keyName: loop[2],
          valueName: loop[1] || loop[3],
          templates: [new Template(el)],
          expressions: [createExpression(loop[4])]
        })
        break

      case InstructionType.CASE:
        throw new Error('the --case directive can only be used within --switch')

      case InstructionType.DEFAULT:
        throw new Error('the --default directive can only be used within --switch')

      case InstructionType.SWITCH:
        const templates: Template[] = []
        const expressions: Expression[] = []

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

          const instName = flowControls[0]
          const instType = InstructionType[instName]
          child.removeAttribute(INSTRUCTION_PREFIX + instName)

          templates.push(new Template(el.removeChild(child)))
          expressions.push(createExpression(instType === InstructionType.CASE ? attrs[instName] : 'true'))
          // TODO: allow only runtime constants in case expressionsa
        })

        if (!isBlankElement(el)) {
          throw new Error('instruction --switch only allows --case and --default children')
        }
        
        // remove empty text-nodes and comments
        el.innerHTML = ''
        // the mount-node becomes the "default --default" template
        el.appendChild(createMountNode(instName))
        // point to the mount-node
        tw.next()
        
        this.instructions.push({
          type: instType,
          target: tw.path(),
          templates,
          expressions,
          'switch': createExpression(value)
        })

        break
    }
  }

  componentState (tw: TreeWalker, name: string | Expression) {
    // flowignore: cast Node to Element
    const root: Element = tw.node
    const slots: { [key: string]: Template } = {}

    // retrieve element nodes from live NodeList for ulterior removal
    const elements = filter(root.childNodes, isElement)
    
    // flowignore: cast Node to Element
    forEach(elements, (el: Element) => {
      const attrs = getAttributes(el, INSTRUCTION_PREFIX)
      
      if (hasOwn.call(attrs, 'SLOT')) {
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
      target: tw.path(),
      name,
      slots
    })
  }

  attributeState (tw: TreeWalker, attrName: string, attrValue: string) {
    // flowignore: cast Node to Element
    const elem: Element = tw.node
    const target = tw.path()
    const expression = createExpression(attrValue)

    if (!expression) {
      throw new Error('prefixed attributes require an expression to evaluate')
    }

    elem.removeAttribute(INSTRUCTION_PREFIX + attrName)

    if (attrName === 'CLASS') {
      this.instructions.push({
        type: InstructionType.CLASSNAME,
        target,
        preset: elem.className,
        expression
      })
    }
    else if (attrName === 'STYLE') {
      this.instructions.push({
        type: InstructionType.STYLE,
        target,
        preset: elem.style.cssText,
        expression
      })
    }
    else if (attrName === 'REF') {
      this.instructions.push({
        type: InstructionType.REFERENCE,
        name: attrValue,
        target
      })
    }
    else if (startsWith(attrName, 'ON-')) {
      this.instructions.push({
        type: InstructionType.LISTENER,
        name: attrName.substring('ON-'.length),
        target,
        expression
      })
    }
    else if (startsWith(attrName, 'DATA-')) {
      this.instructions.push({
        type: InstructionType.CDATA,
        name: attrName.substring('DATA-'.length),
        target,
        expression
      })
    }
    else if (camelCase(attrName) in elem) {
      this.instructions.push({
        type: InstructionType.PROPERTY,
        name: camelCase(attrName),
        target,
        expression
      })
    }
    else {
      this.instructions.push({
        type: InstructionType.ATTRIBUTE,
        name: attrName,
        target,
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