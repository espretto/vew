/* @flow */

import type {
  Instruction,
  TextInstruction,
  ListenerInstruction,
  ClassNameInstruction,
  StyleInstruction,
  PropertyInstruction,
  DatasetInstruction,
  AttributeInstruction,
  ConditionalInstruction,
  SwitchInstruction,
  SlotInstruction
  } from './instruction'
import type Template from './template'
import { InstructionType } from './instruction'

import Scope from './scope'
import { evaluate } from './expression'
import { resolve } from './dom/treewalker'
import Effects from './dom/effects'

import { indexOf, forEach, map, find, flatMap } from './util/array'
import { replaceNode, clone } from './dom/core'
import { hasOwn, getOwn } from './util/object'

function bootstrapSlot ({ nodePath, name, template }: SlotInstruction) {
  const defaultSlot = template ? bootstrapComponent(template) : null

  return function setup (component: Component) {
    const { el, tag, slots } = component

    // content transclusion
    // flowignore: defaultSlot may be null, that's fine
    const slotFactory = getOwn(slots, name, defaultSlot)
    console.assert(slotFactory, `component "${tag}" has no default slot i.e. requires an input slot "${name}"`)
    
    const slot = slotFactory(component, true).mount(resolve(el, nodePath))
    return function teardown () {
      slot.teardown()
    }
  }
}


function bootstrapSwitch ({ nodePath, switched, partials }: SwitchInstruction) {
  const switched_ = evaluate(switched)
  const cases = map(partials, ({ template, expression }) => ({
    setup: bootstrapComponent(template),
    compute: evaluate(expression),
    paths: expression.paths
  }))

  return function setup (parent: Component) {
    const { el, scope } = parent
    const placeholder = resolve(el, nodePath)
    let prev = null
    let mounted: Component | null = null

    function task () {
      const args = map(switched.paths, path => scope.resolve(path))
      const value = switched_.apply(null, args)

      const next = find(cases, ({ compute, paths }) => {
        const args = map(paths, path => scope.resolve(path))
        return value === compute.apply(null, args)
      })

      if (prev === next) return
      else prev = next

      if (mounted) {
        mounted.teardown()
        
        if (next) {
          mounted = next.setup(parent, true).mount(mounted.el)
        }
        else {
          replaceNode(mounted.el, placeholder)
          mounted = null
        }
      }
      else if (next) {
        mounted = next.setup(parent, true).mount(placeholder)
      }
    }

    // initial render
    task()

    // TODO: do not subscribe to conditions below/after the currently fulfilled one
    forEach(switched.paths, path => scope.subscribe(path, task))
    forEach(cases, ({ paths }) => forEach(paths, path => scope.subscribe(path, task)))
    return function teardown () {
      forEach(switched.paths, path => scope.unsubscribe(path, task))
      forEach(cases, ({ paths }) => forEach(paths, path => scope.unsubscribe(path, task)))
    }
  }
}


function bootstrapConditional ({ nodePath, partials }: ConditionalInstruction) {
  const conditioned = map(partials, ({ template, expression }) => ({
    setup: bootstrapComponent(template),
    compute: evaluate(expression),
    paths: expression.paths
  }))

  return function setup (parent: Component) {
    const { el, scope } = parent
    const placeholder = resolve(el, nodePath)
    let prev = null
    let mounted: Component | null = null

    function task () {
      const next = find(conditioned, ({ compute, paths }) => {
        const args = map(paths, path => scope.resolve(path))
        return compute.apply(null, args)
      })

      if (prev === next) return
      else prev = next

      if (mounted) {
        mounted.teardown()
        
        if (next) {
          mounted = next.setup(parent, true).mount(mounted.el)
        }
        else {
          replaceNode(mounted.el, placeholder)
          mounted = null
        }
      }
      else if (next) {
        mounted = next.setup(parent, true).mount(placeholder)
      }
    }

    // initial render
    task()

    // TODO: do not subscribe to conditions below/after the currently fulfilled one
    forEach(conditioned, ({ paths }) => forEach(paths, path => scope.subscribe(path, task)))
    return function teardown () {
      forEach(conditioned, ({ paths }) => forEach(paths, path => scope.unsubscribe(path, task)))
    }
  }
}


function bootstrapSetter ({ type, nodePath, name, expression }: PropertyInstruction | DatasetInstruction | AttributeInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup ({ el, scope }: Component) {
    const target = resolve(el, nodePath)
    
    function task () {
      const args = map(paths, path => scope.resolve(path))
      const input = compute.apply(null, args)
      effect(target, input, name)
    }

    // initial render
    task()

    forEach(paths, path => scope.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => scope.unsubscribe(path, task))
    }
  }
}


function bootstrapPresetSetter ({ type, nodePath, preset, expression }: ClassNameInstruction | StyleInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup ({ el, scope }: Component) {
    let target = resolve(el, nodePath)
    
    function task () {
      const args = map(paths, path => scope.resolve(path))
      const input = compute.apply(null, args)
      effect(target, input, preset)
    }

    // initial render
    task()

    forEach(paths, path => scope.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => scope.unsubscribe(path, task))
    }
  }
}


function bootstrapText ({ type, nodePath, expression }: TextInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup ({ el, scope }: Component) {
    let target = resolve(el, nodePath)
    
    function task () {
      const args = map(paths, path => scope.resolve(path))
      const input = compute.apply(null, args)
      effect(target, input)
    }

    // initial render
    task()

    forEach(paths, path => scope.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => scope.unsubscribe(path, task))
    }
  }
}


function bootstrapListener ({ nodePath, event, expression }: ListenerInstruction) {
  const handler = evaluate(expression)
  const { paths } = expression

  return function setup (component: Component) {
    const { el, scope } = component
    const target = resolve(el, nodePath)

    // TODO: find the host
    let handlerHost = component
    while (handlerHost.isPartial) handlerHost = handlerHost.parent

    function proxy () {
      handler.apply(null, paths.map(path =>
        String(path) === 'this' ? handlerHost : scope.resolve(path)
      ))
    }

    target.addEventListener(event, proxy, false)
    return function teardown () {
      target.removeEventListener(event, proxy, false)
    }
  }
}


const bootstappers = {
  [InstructionType.SLOT]: bootstrapSlot,
  [InstructionType.SWITCH]: bootstrapSwitch,
  [InstructionType.IF]: bootstrapConditional,
  [InstructionType.ATTRIBUTE]: bootstrapSetter,
  [InstructionType.DATASET]: bootstrapSetter,
  [InstructionType.PROPERTY]: bootstrapSetter,
  [InstructionType.CLASSNAME]: bootstrapPresetSetter,
  [InstructionType.STYLE]: bootstrapPresetSetter,
  [InstructionType.TEXT]: bootstrapText,
  [InstructionType.LISTENER]: bootstrapListener,
}

type setup = (
  parent: Component,
  isPartial: boolean,
  slots: ?{ [name: string]: setup }
  ) => Component

export interface Component {
  el: Node,
  tag: string, 
  scope: Scope,
  parent: Component,
  isPartial: boolean,
  teardowns: Function[],
  teardown: () => Component,
  mount: Node => Component,
  mergeState: any => Component,
  slots: { [name: string]: setup }
}

export function bootstrapComponent ({ el, instructions }: Template, data: ?Function): setup {
  const setups = map(instructions, i => bootstappers[i.type](i))

  return function setup (parent: Component, isPartial: boolean, slots: ?{ [name: string]: setup }): Component {
    const component = {
      el: clone(el),
      tag: '', // TODO
      scope: isPartial ? parent.scope : new Scope(),
      isPartial: isPartial,
      parent: parent,
      slots: slots || {},
      teardowns: [],

      // TODO: if is partial, listener instruction expression scope resolvers
      // need to provide the parent component when evaluating key-path ["this"]

      mount (node: Node) {
        replaceNode(node, this.el)
        return this
      },

      teardown () {
        forEach(this.teardowns, teardown => teardown())
        return this
      },

      mergeState (obj: any) {
        this.scope.merge(obj)
        setTimeout(() => { this.scope.update() })
        return this
      }
    }

    if (!isPartial && data) {
      component.scope.data = data()
    }

    // setup subscriptions to scope and render initially
    component.teardowns = map(setups, setup => setup(component))
        
    return component
  }
}
