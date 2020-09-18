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
  LoopInstruction,
  ComponentInstruction,
  ReferenceInstruction
  } from './instruction'
import type Template from './template'
import { InstructionType } from './instruction'


import { Store } from './store'
import Registry from './registry'
import { evaluate } from './expression'
import { resolve } from './dom/treewalker'
import Effects from './dom/effects'

import { indexOf, forEach, map, find } from './util/array'
import { replaceNode, clone } from './dom/core'
import { hasOwn, getOwn, mapOwn, forOwn, keys, extend, create } from './util/object'


// continue: mute tasks which components/partials have been unmounted by other tasks in the same runloop cycle

function bootstrapLoop ({ nodePath, keyName, valueName, partials }: LoopInstruction) {
  const { template, expression } = partials[0]
  const partialFactory = bootstrapComponent(template, true)
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component) {
    const target = resolve(host.el, nodePath)
    const mounted: Component[] = []

    function task () {
      const items = compute.call(host.store.data)
      
      // create missing partials
      while (mounted.length < items.length) {
        const props = { [valueName]: items[mounted.length] }
        const partial = partialFactory(host, props)
        // flowignore: ensure parentNode
        target.parentNode.insertBefore(partial.el, target)
        mounted.push(partial)
      }

      // remove superfluous partials
      while (mounted.length > items.length) {
        const partial = mounted.pop().teardown()
        // flowignore: ensure parentNode
        target.parentNode.removeChild(partial.el)
      }
      
      // items and mounted are of equal length, zip them up
      forEach(items, (item, i) => {
        mounted[i].merge({ [valueName]: item })
      })
    }

    // initial render
    task()

    forEach(paths, path => host.store.subscribe(path, task))
    return function teardown () {
      forEach(mounted, partial => { partial.teardown() })
      forEach(paths, path => host.store.unsubscribe(path, task))
    }
  }
}

function bootsrapReference ({ nodePath, name }: ReferenceInstruction) {

  return function setup (host: Component) {
    // crawl upto the defining component
    while (host.host) host = host.host
    
    // TODO: implement reference arrays or getter(index/key) function for loop instructions
    host.refs[name] = resolve(host.el, nodePath)

    return function teardown () {
      host.refs[name] = null // JIT: faster delete
    }
  }
}

function finalizeComponent ({ nodePath, name, props, slots }: ComponentInstruction) {
  console.assert(hasOwn(Registry, name), `component "${name}" has not been defined`)
  const componentFactory = Registry[name]
  const slotFactories = mapOwn(slots, slot => bootstrapComponent(slot))
  const computes = mapOwn(props, evaluate)
  const paths = [].concat(...map(keys(props), prop => props[prop].paths))

  return function setup (host: Component) {
    
    function getProps () {
      return mapOwn(computes, c => c.call(host.store.data))
    }

    // initial render - we pass props to the constructor so they can be read by child-setup routines
    const component = componentFactory(host, getProps(), mapOwn(slotFactories, setup => setup(host)))
    
    function task () {
      component.merge(getProps())
    }

    component.mount(resolve(host.el, nodePath))
    forEach(paths, path => host.store.subscribe(path, task))
    return function teardown () {
      component.teardown()
      forEach(paths, path => host.store.unsubscribe(path, task))
    }
  }
}

function bootstrapSlot ({ nodePath, name, template }: SlotInstruction) {
  const defaultSlot = template ? bootstrapComponent(template) : null

  return function setup (host: Component) {
    const { el, tag, slots } = host
    const target = resolve(el, nodePath)
    let slot

    // slots render using their defining component's view model. if transcluded,
    // that component is different from their hosting component
    if (slots && hasOwn(slots, name)) {
      slot = slots[name].mount(target)
    }
    else {
      console.assert(defaultSlot != null, `component "${tag}" has no default slot i.e. requires an input slot "${name}"`)
      // flowignore: we just asserted that defaultSlot exists
      slot = defaultSlot(host).mount(target)
    }

    return function teardown () {
      slot.teardown()
    }
  }
}

function bootstrapSwitch ({ nodePath, switched, partials }: SwitchInstruction) {
  const compute = evaluate(switched)

  const cases = map(partials, ({ template, expression }) => ({
    setup: bootstrapComponent(template),
    compute: evaluate(expression),
  }))

  const paths = switched.paths.concat(...map(partials, p => p.expression.paths))

  return function setup (host: Component) {
    const target = resolve(host.el, nodePath)
    let prev = null
    let mounted: Component | null = null

    function task () {
      const value = compute.call(host.store.data)
      const next = find(cases, c => c.compute.call(host.store.data) === value)

      if (prev === next) return
      prev = next

      if (mounted) {
        mounted.teardown()
        
        if (next) {
          mounted = next.setup(host).mount(mounted.el)
        }
        else {
          replaceNode(mounted.el, target)
          mounted = null
        }
      }
      else if (next) {
        mounted = next.setup(host).mount(target)
      }
    }

    // initial render
    task()

    // TODO: do not subscribe to conditions below/after the currently fulfilled one
    forEach(paths, path => host.store.subscribe(path, task))
    return function teardown () {
      if (mounted) mounted.teardown()
      forEach(paths, path => host.store.unsubscribe(path, task))
    }
  }
}

function bootstrapConditional ({ nodePath, partials }: ConditionalInstruction) {
  const conditions = map(partials, ({ template, expression }) => ({
    setup: bootstrapComponent(template),
    compute: evaluate(expression),
  }))

  const paths = [].concat(...map(partials, p => p.expression.paths));

  return function setup (host: Component) {
    const target = resolve(host.el, nodePath)
    let prev = null
    let mounted: Component | null = null

    function task () {
      const next = find(conditions, c => c.compute.call(host.store.data))

      if (prev === next) return
      prev = next

      if (mounted) {
        mounted.teardown()
        
        if (next) {
          mounted = next.setup(host).mount(mounted.el)
        }
        else {
          replaceNode(mounted.el, target)
          mounted = null
        }
      }
      else if (next) {
        mounted = next.setup(host).mount(target)
      }
    }

    // initial render
    task()

    // TODO: do not subscribe to conditions below/after the currently fulfilled one
    forEach(paths, path => host.store.subscribe(path, task));
    return function teardown () {
      if (mounted) mounted.teardown()
      forEach(paths, path => host.store.unsubscribe(path, task));
    }
  }
}

function bootstrapSetter ({ type, nodePath, name, expression }: PropertyInstruction | DatasetInstruction | AttributeInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component) {
    const target = resolve(host.el, nodePath)
    
    function task () {
      effect(target, compute.call(host.store.data), name)
    }

    // initial render
    task()

    forEach(paths, path => host.store.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => host.store.unsubscribe(path, task))
    }
  }
}

function bootstrapPresetSetter ({ type, nodePath, preset, expression }: ClassNameInstruction | StyleInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component) {
    let target = resolve(host.el, nodePath)
    
    function task () {
      effect(target, compute.call(host.store.data), preset)
    }

    // initial render
    task()

    forEach(paths, path => host.store.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => host.store.unsubscribe(path, task))
    }
  }
}

function bootstrapText ({ type, nodePath, expression }: TextInstruction) {
  const effect = Effects[type]
  const { paths } = expression
  const compute = evaluate(expression)

  return function setup (host: Component) {
    let target = resolve(host.el, nodePath)
    
    function task () {
      effect(target, compute.call(host.store.data))
    }

    // initial render
    task()

    forEach(paths, path => host.store.subscribe(path, task))
    return function teardown () {
      forEach(paths, path => host.store.unsubscribe(path, task))
    }
  }
}

function bootstrapListener ({ nodePath, event, expression }: ListenerInstruction) {
  const { paths } = expression
  const handler = evaluate(expression)

  return function setup (host: Component) {
    const target = resolve(host.el, nodePath)

    function proxy () {
      // TODO: unclear how to get hold of the event object or the reference to the component instance
      handler.call(host.store.data);
    }

    target.addEventListener(event, proxy, false)
    return function teardown () {
      target.removeEventListener(event, proxy, false)
    }
  }
}

type taskFactory = (host: Component) => () => void;

const bootstappers: { [type: string]: any => taskFactory } = {
  [InstructionType.FOR]: bootstrapLoop,
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
  props?: { [prop: string]: any },
  slots?: { [name: string]: Component }
  ) => Component;

type ReferenceMap = { [name: string]: Node | Node[] | null };

export interface Component {
  el: Node,
  tag: string,
  host: Component,
  refs: ReferenceMap,
  store: Store,
  slots: ?{ [name: string]: Component },
  teardowns: Function[],

  mount: Node => Component,
  teardown: () => Component,
  merge: (state: any) => Component,
}

/**
 * @param template - dom fragment and instruction to act on it
 * @param state - initial state factory. if not provided, the state will be
 *   inherited from the parent component.
 */
export function bootstrapComponent (template: Template, state?: Function): componentFactory {
  const setups = map(template.instructions, i => bootstappers[i.type](i))

  const setup: componentFactory = (host, props, slots) => {
    const store = state
      // components
      ? props
        ? new Store(extend(state(), props))
        : new Store(state())
      // partials (flow control subtrees and slots)
      : props
        ? new Store(extend(props, host.store.data))
        : host.store

    const component = {
      el: clone(template.el),
      tag: '',
      host,
      refs: {},
      slots,
      store,
      teardowns: [],

      mount (node: Node) {
        replaceNode(node, this.el)
        return this
      },

      teardown () {
        forEach(this.teardowns, teardown => teardown())
        return this
      },

      merge (src) {
        this.store.merge(src)
        this.store.update()
        return this
      }
    }

    // setup subscriptions to state and render initially
    component.teardowns = map(setups, setup => setup(component))
        
    return component
  }

  return setup
}