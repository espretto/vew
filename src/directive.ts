import type { NodePath } from "./dom/treewalker";
import type { Expression } from "./expression";
import type Template from "./template";

export enum DirectiveType {
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
FlowControlTypes[DirectiveType.IF] =
FlowControlTypes[DirectiveType.ELIF] =
FlowControlTypes[DirectiveType.ELSE] =
FlowControlTypes[DirectiveType.FOR] =
FlowControlTypes[DirectiveType.SWITCH] =
FlowControlTypes[DirectiveType.CASE] =
FlowControlTypes[DirectiveType.DEFAULT] = true;

export function isFlowControl(type: string): boolean {
  return FlowControlTypes[type] === true;
}

export interface Partial {
  template: Template;
  expression: Expression;
}

interface BaseDirective {
  type: DirectiveType;
  nodePath: NodePath;
}

export interface TextDirective extends BaseDirective {
  type: DirectiveType.TEXT;
  expression: Expression;
}

export interface SlotDirective extends BaseDirective {
  type: DirectiveType.SLOT;
  name: string;
  template: Template | null;
}

/** regroups IF, ELIF, ELSE */
//  continue: map instructions to dom manipulations
export interface ConditionalDirective extends BaseDirective {
  type: DirectiveType.IF | DirectiveType.ELIF | DirectiveType.ELSE;
  partials: Partial[];
}

export interface LoopDirective extends BaseDirective {
  type: DirectiveType.FOR;
  keyName: string;
  valueName: string;
  partials: Partial[];
}

export interface SwitchDirective extends BaseDirective {
  type: DirectiveType.SWITCH;
  switched: Expression;
  partials: Partial[];
}

export interface ComponentDirective extends BaseDirective {
  type: DirectiveType.COMPONENT;
  name: string;
  slots: { [name: string]: Template };
  props: { [prop: string]: Expression };
}

export interface ClassNameDirective extends BaseDirective {
  type: DirectiveType.CLASSNAME;
  preset: string;
  expression: Expression;
}

export interface StyleDirective extends BaseDirective {
  type: DirectiveType.STYLE;
  preset: string;
  expression: Expression;
}

export interface ReferenceDirective extends BaseDirective {
  type: DirectiveType.REFERENCE;
  name: string;
}

export interface ListenerDirective extends BaseDirective {
  type: DirectiveType.LISTENER;
  event: string;
  expression: Expression;
}

export interface DatasetDirective extends BaseDirective {
  type: DirectiveType.DATASET;
  name: string;
  expression: Expression;
}

export interface PropertyDirective extends BaseDirective {
  type: DirectiveType.PROPERTY;
  name: string;
  expression: Expression;
}

export interface AttributeDirective extends BaseDirective {
  type: DirectiveType.ATTRIBUTE;
  name: string;
  expression: Expression;
}

export type Directive =
    TextDirective
  | SlotDirective
  | ConditionalDirective
  | LoopDirective
  | SwitchDirective
  | ComponentDirective
  | ClassNameDirective
  | StyleDirective
  | ReferenceDirective
  | ListenerDirective
  | DatasetDirective
  | PropertyDirective
  | AttributeDirective
