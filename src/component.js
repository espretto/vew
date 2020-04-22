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
  SlotInstruction,
  ComponentInstruction,
  ReferenceInstruction
  } from './instruction'
import type Template from './template'
import { InstructionType } from './instruction'


import type { Store } from './store'
import { State, Props } from './store'
import Registry from './registry'
import { evaluate } from './expression'
import { resolve } from './dom/treewalker'
import Effects from './dom/effects'

import { indexOf, forEach, map, find } from './util/array'
import { replaceNode, clone } from './dom/core'
import { hasOwn, getOwn, mapOwn, forOwn } from './util/object'


// continue: mute tasks which components/partials have been unmounted by other tasks in the same runloop cycle

function bootsrapReference ({ nodePath, name }: ReferenceInstruction) {

  return function setup (host: Component, provider: Component) {
    // TODO: implement reference arrays or getter(index/key) function for loop instructions
    provider.refs[name] = resolve(host.el, nodePath)

    return function teardown () {
      provider.refs[name] = null // JIT: faster delete
    }
  }
}


function finalizeComponent ({ nodePath, name, props, slots }: ComponentInstruction) {
  console.assert(hasOwn.call(Registry, name), `component "${name}" has not been defined`)
  const componentFactory = Registry[name]
  const slotFactories = mapOwn(slots, slot => bootstrapComponent(slot))
  const properties = mapOwn(props, (expression, prop) => ({
    compute: evaluate(expression),
    paths: expression.paths
  }))

  return function setup (host: Component, provider: Component) {
    
    function getProps () {
      return mapOwn(properties, ({ compute, paths }) =>
        compute.apply(null, map(paths, path =>
          provider.store.resolve(path)
        ))
      )
    }

    function task () {
      component.store.merge(getProps)
    }

    // initial render
    const component = componentFactory(host, provider, getProps, slotFactories)

    component.mount(resolve(host.el, nodePath))
    forOwn(properties, ({ paths }) => forEach(paths, path => provider.store.subscribe(path, task)))
    return function teardown () {
      forOwn(properties, ({ paths }) => forEach(paths, path => provider.store.unsubscribe(path, task)))
      component.teardown()
    }
  }
}


function bootstrapSlot ({ nodePath, name, template }: SlotInstruction) {
  const defaultSlot = template ? bootstrapComponent(template) : null

  return function setup (host: Component, provider: Component) {
    const { el, tag, slots } = host
    const target = resolve(el, nodePath)
    let slot

    // slots render using their defining component's view model. if transcluded,
    // that component is not the same as their host
    if (slots && hasOwn.call(slots, name)) {
      slot = slots[name](host, provider).mount(target)
    }
    else {
      console.assert(defaultSlot != null, `component "${tag}" has no default slot i.e. requires an input slot "${name}"`)
      // flowignore: we just asserted that defaultSlot exists
      slot = defaultSlot(host, host).mount(target)
    }

    return function teardown () {
      slot.teardown()
    }
  }
}


function bootstrapSwitch ({ nodePath, switched, partials }: SwitchInstruction) {
  const computeSwitched = evaluate(switched)

  const cases = map(partials, ({ template, expression }) => ({
    setup: bootstrapComponent(template),
    compute: evaluate(expression),
    paths: expression.paths
  }))



  return function setup (host: Component, provider: Component) {
    const target = resolve(host.el, nodePath)
    let prev = null
    let mounted: Component | null = null

    function task () {
      const args = map(switched.paths, path => provider.store.resolve(path))
      const value = computeSwitched.apply(null, args)

      const next = find(cases, ({ compute, paths }) => {
        const args = map(paths, path => provider.store.resolve(path))
        return value === compute.apply(null, args)
      })

      if (prev === next) return
      else prev = next

      if (mounted) {
        mounted.teardown()
        
        if (next) {
          mounted = next.setup(host, provider).mount(mounted.el)
        }
        else {
          replaceNode(mounted.el, target)
          mounted = null
        }
      }
      else if (next) {
        mounted = next.setup(host, provider).mount(target)
      }
    }

    // initial render
    task()

    // TODO: do not subscribe to conditions below/after the currently fulfilled one
    forEach(switched.paths, path => provider.store.subscribe(path, task))
    forEach(cases, ({ paths }) => forEach(paths, path => provider.store.subscribe(path, task)))
    return function teardown () {
      forEach(switched.paths, path => provider.store.unsubscribe(path, task))
      forEach(cases, ({ paths }) => forEach(paths, path => provider.store.unsubscribe(path, task)))
    }
  }
}


function bootstrapConditional ({ nodePath, partials }: ConditionalInstruction) {
  const conditioned = map(partials, ({ template, expression }) => ({
    setup: bootstrapComponent(template),
    compute: evaluate(expression),
    paths: expression.paths
  }))

  return function setup (host: Component, provider: Component) {
    const target = resolve(host.el, nodePath)
    let prev = null
    let mounted: Component | null = null

    function task () {
      const next = find(conditioned, ({ compute, paths }) => {
        const args = map(paths, path => provider.store.resolve(path))
        return compute.apply(null, args)
      })

      if (prev === next) return
      else prev = next

      if (mounted) {
        mounted.teardown()
        
        if (next) {
          mounted = next.setup(host, provider).mount(mounted.el)
        }
        else {
          replaceNode(mounted.el, target)
          mounted = null
        }
      }
      else if (next) {
        mounted = next.setup(host, provider).mount(target)
      }
    }

    // initial render
    task()

    // TODO: do not subscribe to conditions below/after the currently fulfilled one
    forEach(conditioned, ({ paths }) => forEach(paths, path => provider.store.subscribe(path, task)))
    return function teardown () {
      forEach(conditioned, ({ paths }) => forEach(paths, path => provider.store.unsubscribe(path, task)))
    }
  }
}


function bootstrapSetter ({ type, nodePath, name, expression }: PropertyInstruction | DatasetInstruction | AttributeInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component, provider: Component) {
    const target = resolve(host.el, nodePath)
    
    function task () {
      const args = map(paths, path => provider.store.resolve(path))
      const input = compute.apply(null, args)
      effect(target, input, name)
    }

    // initial render
    task()

    forEach(paths, path => provider.store.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => provider.store.unsubscribe(path, task))
    }
  }
}


function bootstrapPresetSetter ({ type, nodePath, preset, expression }: ClassNameInstruction | StyleInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component, provider: Component) {
    let target = resolve(host.el, nodePath)
    
    function task () {
      const args = map(paths, path => provider.store.resolve(path))
      const input = compute.apply(null, args)
      effect(target, input, preset)
    }

    // initial render
    task()

    forEach(paths, path => provider.store.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => provider.store.unsubscribe(path, task))
    }
  }
}


function bootstrapText ({ type, nodePath, expression }: TextInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component, provider: Component) {
    let target = resolve(host.el, nodePath)
    
    function task () {
      const args = map(paths, path => provider.store.resolve(path))
      const input = compute.apply(null, args)
      effect(target, input)
    }

    // initial renderisPartial: boolean, 
    task()

    forEach(paths, path => provider.store.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => provider.store.unsubscribe(path, task))
    }
  }
}


function bootstrapListener (instruction: ListenerInstruction) {
  const { nodePath, event, expression } = instruction
  const handler = evaluate(expression)
  const { paths } = expression

  return function setup (host: Component, provider: Component) {
    const target = resolve(host.el, nodePath)

    function proxy () {
      handler.apply(null, paths.map(path =>
        String(path) === 'this' ? provider : provider.store.resolve(path)
      ))
    }

    target.addEventListener(event, proxy, false)
    return function teardown () {
      target.removeEventListener(event, proxy, false)
    }
  }
}

type taskFactory = (host: Component, provider: Component) => () => void

const bootstappers: { [type: string]: any => taskFactory } = {
  [InstructionType.REFERENCE]: bootsrapReference,
  [InstructionType.COMPONENT]: finalizeComponent,
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

export type componentFactory = (
  host: Component,
  provider: Component,
  getProps?: Function,
  slots?: { [name: string]: componentFactory }
  ) => Component

export interface Component {
  el: Node,
  tag: string, 
  host: Component,
  refs: { [name: string ]: ?Node },
  store: Store,
  slots: ?{ [name: string]: componentFactory },
  teardowns: Function[],

  mount: Node => Component,
  teardown: () => Component
}

export function bootstrapComponent (template: Template, isComponent: ?boolean, getState?: Function): componentFactory {
  const setups = map(template.instructions, i => bootstappers[i.type](i))

  const setup: componentFactory = (host, provider, getProps, slots) => {      
    const component = {
      el: clone(template.el),
      tag: '', // TODO
      host: host,
      // flowignore: TODO
      refs: isComponent ? {} : null,
      slots: slots,
      teardowns: [],
      
      // TODO: implement default properties
      store:
        getState
          ? getProps
              ? new Props(new State(getState), getProps) // stateful components with properties
              : new State(getState) // stateful components, probably toplevel
          : getProps
              ? new Props(provider.store, getProps) // --for partials
              : provider.store, // useless

      mount (node: Node) {
        replaceNode(node, this.el)
        return this
      },

      teardown () {
        forEach(this.teardowns, teardown => teardown())
        return this
      }
    }

    // setup subscriptions to state and render initially
    component.teardowns = map(setups, setup => setup(component, provider || component))
        
    return component
  }

  return setup
}