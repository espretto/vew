/* @flow */

import type { NodePath } from './dom/treewalker'
import type { Expression } from './expression'
import type Template from './template'

export const InstructionType = {
  IF: 'IF',
  ELIF: 'ELIF',
  ELSE: 'ELSE',
  FOR: 'FOR',
  SWITCH: 'SWITCH',
  CASE: 'CASE',
  DEFAULT: 'DEFAULT',
  SLOT: 'SLOT',
  COMPONENT: 'COMPONENT',
  LISTENER: 'LISTENER',
  REFERENCE: 'REFERENCE',
  STYLE: 'STYLE',
  DATASET: 'DATASET',
  PROPERTY: 'PROPERTY',
  CLASSNAME: 'CLASSNAME',
  ATTRIBUTE: 'ATTRIBUTE',
  TEXT: 'TEXT'
}

const FlowControlTypes = {}
FlowControlTypes[InstructionType.IF] =
FlowControlTypes[InstructionType.ELIF] =
FlowControlTypes[InstructionType.ELSE] =
FlowControlTypes[InstructionType.FOR] =
FlowControlTypes[InstructionType.SWITCH] =
FlowControlTypes[InstructionType.CASE] =
FlowControlTypes[InstructionType.DEFAULT] = true

export function isFlowControl (type: string): boolean {
  return FlowControlTypes[type] === true
}

export type Partial = {|
  template: Template,
  expression: Expression
|}

export interface Instruction {
  type: $Keys<typeof InstructionType>,
  nodePath: NodePath
}

export interface TextInstruction extends Instruction {
  expression: Expression
}

export interface SlotInstruction extends Instruction {
  name: string,
  template: Template | null
}

/** regroups IF, ELIF, ELSE */
//  continue: map instructions to dom manipulations
export interface ConditionalInstruction extends Instruction {
  partials: Partial[]
}

export interface LoopInstruction extends Instruction {
  keyName: string,
  valueName: string,
  partials: Partial[]
}

export interface SwitchInstruction extends Instruction {
  switched: Expression,
  partials: Partial[]
}

export interface ComponentInstruction extends Instruction {
  name: string,
  slots: { [name: string]: Template },
  props: { [prop: string]: Expression }
}

export interface ClassNameInstruction extends Instruction {
  preset: string,
  expression: Expression
}

export interface StyleInstruction extends Instruction {
  preset: string,
  expression: Expression
}

export interface ReferenceInstruction extends Instruction {
  name: string
}

export interface ListenerInstruction extends Instruction {
  event: string,
  expression: Expression
}

export interface DatasetInstruction extends Instruction {
  name: string,
  expression: Expression
}

export interface PropertyInstruction extends Instruction {
  name: string,
  expression: Expression
}

export interface AttributeInstruction extends Instruction {
  name: string,
  expression: Expression
}
