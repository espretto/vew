/* @flow */

import type { NodePath } from './dom/treewalker'
import type { Expression } from './expression'
import type Template from './template'

export const InstructionType = {
  IF:        1 << 0,
  ELIF:      1 << 1,
  ELSE:      1 << 2,
  FOR:       1 << 3,
  SWITCH:    1 << 4,
  CASE:      1 << 5,
  DEFAULT:   1 << 6,
  SLOT:      1 << 7,
  COMPONENT: 1 << 8,
  LISTENER:  1 << 9,
  REFERENCE: 1 << 10,
  STYLE:     1 << 11,
  CDATA:     1 << 12,
  PROPERTY:  1 << 13,
  CLASSNAME: 1 << 14,
  ATTRIBUTE: 1 << 15,
  NODEVALUE: 1 << 16
}

const FlowControlMask =
  InstructionType.IF |
  InstructionType.ELIF |
  InstructionType.ELSE |
  InstructionType.FOR |
  InstructionType.SWITCH |
  InstructionType.CASE |
  InstructionType.DEFAULT

export function isFlowControl (type: string): boolean {
  return (InstructionType[type] & FlowControlMask) !== 0
}

export interface Instruction {
  type: number, // $Values<typeof InstructionType>,
  target: NodePath
}

export interface ReferenceInstruction extends Instruction {
  name: string
}

export interface TextInstruction extends Instruction {
  expression: Expression
}

export interface MutationInstruction extends Instruction {
  name: string,
  expression: Expression
}

export interface PresetMutationInstruction extends Instruction {
  preset: string,
  expression: Expression
}

export interface SlotInstruction extends Instruction {
  name: string,
  template: Template | null
}

export interface ComponentInstruction extends Instruction {
  name: string,
  slots: { [key: string]: Template }
}

export interface FlowControlInstruction extends Instruction {
  templates: Template[],
  expressions: Expression[]
}

export interface ForInstruction extends FlowControlInstruction {
  key: string,
  value: Expression
}

export interface SwitchInstruction extends FlowControlInstruction {
  switch: Expression
}
