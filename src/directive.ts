import type { NodePath } from './dom/treewalker'
import type { Expression } from './expression'
import type Template from './template'

export enum DirectiveType {
  IF = 'IF',
  FOR = 'FOR',
  ELIF = 'ELIF',
  ELSE = 'ELSE',
  CASE = 'CASE',
  TEXT = 'TEXT',
  SLOT = 'SLOT',
  STYLE = 'STYLE',
  SWITCH = 'SWITCH',
  DATASET = 'DATASET',
  DEFAULT = 'DEFAULT',
  PROPERTY = 'PROPERTY',
  LISTENER = 'LISTENER',
  CLASSNAME = 'CLASSNAME',
  ATTRIBUTE = 'ATTRIBUTE',
  REFERENCE = 'REFERENCE',
  COMPONENT = 'COMPONENT',
}

export type TopLevelDirective =
  | DirectiveType.IF
  | DirectiveType.FOR
  | DirectiveType.TEXT
  | DirectiveType.SLOT
  | DirectiveType.STYLE
  | DirectiveType.SWITCH
  | DirectiveType.DATASET
  | DirectiveType.PROPERTY
  | DirectiveType.LISTENER
  | DirectiveType.CLASSNAME
  | DirectiveType.ATTRIBUTE
  | DirectiveType.REFERENCE
  | DirectiveType.COMPONENT


const FlowControlDirectives = {}
FlowControlDirectives[DirectiveType.IF] =
FlowControlDirectives[DirectiveType.FOR] =
FlowControlDirectives[DirectiveType.ELIF] =
FlowControlDirectives[DirectiveType.ELSE] =
FlowControlDirectives[DirectiveType.CASE] =
FlowControlDirectives[DirectiveType.SWITCH] =
FlowControlDirectives[DirectiveType.DEFAULT] = true

export function isFlowControl(directive: DirectiveType): boolean {
  return FlowControlDirectives[directive] === true
}

interface BaseConfig {
  type: DirectiveType
  nodePath: NodePath
}

export interface PartialConfig {
  template: Template
  expression: Expression
}

export interface TextConfig extends BaseConfig {
  type: DirectiveType.TEXT
  expression: Expression
}

export interface SlotConfig extends BaseConfig {
  type: DirectiveType.SLOT
  name: string
  template: Template | null
}

export interface IfConfig extends BaseConfig {
  type:
    | DirectiveType.IF
    | DirectiveType.ELIF
    | DirectiveType.ELSE
    | DirectiveType.SWITCH
  partials: PartialConfig[]
}

export interface SwitchConfig extends IfConfig {
  type: DirectiveType.SWITCH
  switched: Expression
}

export interface ForConfig extends BaseConfig {
  type: DirectiveType.FOR
  keyName: string
  valueName: string
  partials: PartialConfig[]
}

export interface ComponentConfig extends BaseConfig {
  type: DirectiveType.COMPONENT
  name: string
  slots: Record<string, Template>
  props: Record<string, Expression>
}

export interface ReferenceConfig extends BaseConfig {
  type: DirectiveType.REFERENCE
  name: string
}

export interface ListenerConfig extends BaseConfig {
  type: DirectiveType.LISTENER
  event: string
  expression: Expression
}

export interface SetterConfig extends BaseConfig {
  type:
    | DirectiveType.STYLE
    | DirectiveType.DATASET
    | DirectiveType.PROPERTY
    | DirectiveType.CLASSNAME
    | DirectiveType.ATTRIBUTE
  payload: string
  expression: Expression
}

export type DirectiveConfig =
  | TextConfig
  | SlotConfig
  | IfConfig
  | ForConfig
  | SwitchConfig
  | ComponentConfig
  | SetterConfig
  | ReferenceConfig
  | ListenerConfig
