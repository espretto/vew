import type { NodePath } from "./dom/treewalker";
import type { Expression } from "./expression";
import type Template from "./template";

export enum InstructionType {
  IF = "IF",
  ELIF = "ELIF",
  ELSE = "ELSE",
  FOR = "FOR",
  SWITCH = "SWITCH",
  CASE = "CASE",
  DEFAULT = "DEFAULT",
  SLOT = "SLOT",
  COMPONENT = "COMPONENT",
  LISTENER = "LISTENER",
  REFERENCE = "REFERENCE",
  STYLE = "STYLE",
  DATASET = "DATASET",
  PROPERTY = "PROPERTY",
  CLASSNAME = "CLASSNAME",
  ATTRIBUTE = "ATTRIBUTE",
  TEXT = "TEXT",
}

const FlowControlTypes = {};
FlowControlTypes[InstructionType.IF] =
FlowControlTypes[InstructionType.ELIF] =
FlowControlTypes[InstructionType.ELSE] =
FlowControlTypes[InstructionType.FOR] =
FlowControlTypes[InstructionType.SWITCH] =
FlowControlTypes[InstructionType.CASE] =
FlowControlTypes[InstructionType.DEFAULT] = FlowControlTypes;

export function isFlowControl(type: string): boolean {
  return FlowControlTypes[type] === FlowControlTypes;
}

export interface Partial {
  template: Template;
  expression: Expression;
}

export interface Instruction {
  type: InstructionType;
  nodePath: NodePath;
}

export interface TextInstruction extends Instruction {
  type: InstructionType.TEXT;
  expression: Expression;
}

export interface SlotInstruction extends Instruction {
  type: InstructionType.SLOT;
  name: string;
  template: Template | null;
}

/** regroups IF, ELIF, ELSE */
//  continue: map instructions to dom manipulations
export interface ConditionalInstruction extends Instruction {
  type: InstructionType.IF | InstructionType.ELIF | InstructionType.ELSE;
  partials: Partial[];
}

export interface LoopInstruction extends Instruction {
  type: InstructionType.FOR;
  keyName: string;
  valueName: string;
  partials: Partial[];
}

export interface SwitchInstruction extends Instruction {
  type: InstructionType.SWITCH;
  switched: Expression;
  partials: Partial[];
}

export interface ComponentInstruction extends Instruction {
  type: InstructionType.COMPONENT;
  name: string;
  slots: { [name: string]: Template };
  props: { [prop: string]: Expression };
}

export interface ClassNameInstruction extends Instruction {
  type: InstructionType.CLASSNAME;
  preset: string;
  expression: Expression;
}

export interface StyleInstruction extends Instruction {
  type: InstructionType.STYLE;
  preset: string;
  expression: Expression;
}

export interface ReferenceInstruction extends Instruction {
  type: InstructionType.REFERENCE;
  name: string;
}

export interface ListenerInstruction extends Instruction {
  type: InstructionType.LISTENER;
  event: string;
  expression: Expression;
}

export interface DatasetInstruction extends Instruction {
  type: InstructionType.DATASET;
  name: string;
  expression: Expression;
}

export interface PropertyInstruction extends Instruction {
  type: InstructionType.PROPERTY;
  name: string;
  expression: Expression;
}

export interface AttributeInstruction extends Instruction {
  type: InstructionType.ATTRIBUTE;
  name: string;
  expression: Expression;
}
