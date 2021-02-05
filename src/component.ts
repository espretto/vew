import type {
  ComponentConfig, IfConfig, ListenerConfig, ForConfig,
  ReferenceConfig, SlotConfig, SetterConfig,
  SwitchConfig, TextConfig,
} from './directive'
import { DirectiveType, DirectiveConfig, TopLevelDirective } from './directive';
import { clone, replaceNode } from './dom/core'
import Effects from './dom/effects'
import { resolve, NodePath } from './dom/treewalker';
import { evaluate } from './expression'
import Registry from './registry'
import { Store, StoreLayer, Command } from './store';
import { find, flatten, forEach, map, forBoth } from './util/array'
import { KeyPath } from './util/path'
import { extend, forOwn, hasOwn, keys, mapOwn } from './util/object'
import Template from './template';

// continue: mute tasks which components/partials have been unmounted by other tasks in the same runloop cycle

interface Installer {
  (host: Component): Directive
}

interface Directive {
  destructor(): void
}

class ForDirective implements Directive, Command {

  // TODO: elif/else branching after loop expressions 
  static configure ({ nodePath, keyName, valueName, partials }: ForConfig): Installer {
    const { template, expression } = partials[0]
    const partialFactory = Component.configure(template)
    const compute = evaluate(expression)
    return (host: Component) => new ForDirective(host, valueName, partialFactory, expression.paths, compute, nodePath)
  }
  
  target: Node

  partials: Component[]

  constructor (
    public host: Component, // continue: babel doesnt transform constructor parameter properties correctly
    public valueName: string,
    public partialFactory: ComponentFactory,
    public paths: KeyPath[],
    public compute: Function,
    nodePath: NodePath,
  ) {
    this.target = resolve(host.el, nodePath)
    this.partials = []
    this.execute()
    forEach(this.paths, path => host.store.subscribe(path, this))
  }

  destructor () {
    forEach(this.partials, partial => { partial.destructor() })
    forEach(this.paths, path => this.host.store.unsubscribe(path, this))
  }

  execute () {
    const items: any[] = this.compute.call(this.host.store.data)
    
    // create missing partials
    while (this.partials.length < items.length) {
      const props = { [this.valueName]: items[this.partials.length] }
      const partial = this.partialFactory(this.host, props)
      // TODO: subscribe to host on every path except `valueName` and `keyName`
      // @ts-expect-error: target has a parent
      target.parentNode.appendChild(partial.el)
      this.partials.push(partial)
    }
    
    // remove superfluous partials
    while (this.partials.length > items.length) {
      // @ts-expect-error: this.partials is not empty
      const partial = this.partials.pop().teardown()
      // @ts-expect-error: target has a parent
      target.parentNode.removeChild(partial.el)
    }
    
    // items and partials are of equal length, zip them up
    forBoth(this.partials, items, (partial, item) => {
      partial.merge({ [this.valueName]: item })
    })
  }
}


// TODO: implement reference arrays or getter(index/key) function for loop instructions
class ReferenceDirective implements Directive {
  
  static configure ({ nodePath, name }: ReferenceConfig): Installer {
    return (host: Component) => new ReferenceDirective(host, name, nodePath)
  }

  constructor (public host: Component, public name: string, nodePath: NodePath) {
    while (host.host) host = host.host
    host.refs[name] = resolve(host.el, nodePath)
  }

  destructor () {
    this.host.refs[this.name] = null // JIT: faster delete
  }
}


class ComponentDirective implements Directive, Command {

  static configure ({ nodePath, name, props, slots }: ComponentConfig): Installer {
    console.assert(hasOwn(Registry, name), `component "${name}" has not been defined`)
    const componentFactory = Registry[name]
    const slotFactories = mapOwn(slots, (slot, slotName) => Component.configure(slot, name + ":" + slotName))
    const computes = mapOwn(props, evaluate)
    const paths = flatten(map(keys(props), prop => props[prop].paths))
  
    return (host: Component) => new ComponentDirective(host, paths, computes, componentFactory, slotFactories, nodePath)
  }

  component: Component

  constructor(
    public host: Component,
    public paths: KeyPath[],
    public computes: { [key: string]: Function },
    componentFactory: ComponentFactory,
    slotFactories: Record<string, ComponentFactory>,
    nodePath: NodePath
  ) {
    const slots = mapOwn(slotFactories, slotFactory => slotFactory(host))
    this.component = componentFactory(host, this.getProps(), slots).mount(resolve(host.el, nodePath))
    forEach(this.paths, path => this.host.store.subscribe(path, this))
  }

  destructor () {
    this.component.destructor()
    forEach(this.paths, path => this.host.store.unsubscribe(path, this))
  }

  execute () {
    this.component.merge(this.getProps())
  }

  getProps () {
    return mapOwn(this.computes, compute => compute.call(this.host.store.data))
  }
}


class SlotDirective implements Directive {

  static configure ({ nodePath, name, template }: SlotConfig): Installer {
    const defaultSlotFactory = template ? Component.configure(template) : null
    return (host: Component) => new SlotDirective(host, name, defaultSlotFactory, nodePath)
  }

  slot: Component

  constructor(public host: Component, name: string, defaultSlotFactory: ComponentFactory | null, nodePath: NodePath) {
    const { el, tag, slots } = host
    const target = resolve(el, nodePath)

    // slots render using their defining component's view model. if transcluded,
    // that component is different from their hosting component
    if (slots && hasOwn(slots, name)) {
      this.slot = slots[name].mount(target)
    }
    else {
      console.assert(defaultSlotFactory != null, `component "${tag}" has no default slot i.e. requires an input slot "${name}"`)
      // @ts-expect-error: we just asserted that defaultSlotFactory exists
      this.slot = defaultSlotFactory(host).mount(target)
    }
  }

  destructor () {
    this.slot.destructor()
  }
}

type Branch = { install: (host: Component) => Component, compute: Function }

class IfDirective implements Directive, Command {

  static configure ({ nodePath, partials }: IfConfig): Installer {
    const paths = flatten(map(partials, partial => partial.expression.paths));
    const branches = map(partials, ({ template, expression }) => ({
      install: Component.configure(template),
      compute: evaluate(expression),
    }))
  
    return (host: Component) => new IfDirective(host, paths, branches, nodePath)
  }

  target: Node

  partial: Component | null = null

  previousBranch: Branch | null = null

  constructor (
    public host: Component,
    public paths: KeyPath[],
    public branches: Branch[],
    nodePath: NodePath
  ) {
    this.target = resolve(host.el, nodePath)
    this.execute()
    forEach(this.paths, path => this.host.store.subscribe(path, this))
  }

  destructor () {
    if (this.partial) this.partial.destructor()
    forEach(this.paths, path => this.host.store.unsubscribe(path, this))
  }

  execute() {
    const nextBranch = this.getNextBranch()

    if (this.previousBranch === nextBranch) return
    this.previousBranch = nextBranch

    if (this.partial) {
      this.partial.destructor()
      
      if (nextBranch) {
        this.partial = nextBranch.install(this.host).mount(this.partial.el)
      }
      else {
        // TODO: create the "null-case" to uniform the interface
        replaceNode(this.partial.el, this.target)
        this.partial = null
      }
    }
    else if (nextBranch) {
      this.partial = nextBranch.install(this.host).mount(this.target)
    }
  }

  getNextBranch () {
    return find(this.branches, case_ => case_.compute.call(this.host.store.data))
  }
}


class SwitchDirective extends IfDirective {

  static configure ({ nodePath, partials, switched }: SwitchConfig): Installer {
    const compute = evaluate(switched)
    const paths = switched.paths.concat(...map(partials, p => p.expression.paths))
    const branches = map(partials, ({ template, expression }) => ({
      install: Component.configure(template),
      compute: evaluate(expression),
    }))
  
    return (host: Component) => new SwitchDirective(host, paths, branches, nodePath, compute)
  }

  constructor (
    host: Component,
    paths: KeyPath[],
    branches: Branch[],
    nodePath: NodePath,
    public compute: Function,
  ) {
    super(host, paths, branches, nodePath)
  }

  getNextBranch () {
    const value = this.compute.call(this.host.store.data)
    return find(this.branches, case_ => case_.compute.call(this.host.store.data) === value)
  }
}


class SetterDirective implements Directive, Command {

  static configure ({ type, nodePath, payload, expression }: SetterConfig): Installer {
    const effect = Effects[type]
    const compute = evaluate(expression)
  
    return (host: Component) => new SetterDirective(host, expression.paths, compute, effect, payload, nodePath)
  }

  target: Node

  constructor(
    public host: Component,
    public paths: KeyPath[],
    public compute: Function,
    public effect: Function,
    public payload: string,
    nodePath: NodePath,
  ) {
    this.target = resolve(host.el, nodePath)
    this.execute()
    forEach(this.paths, path => this.host.store.subscribe(path, this))
  }

  destructor () {
    forEach(this.paths, path => this.host.store.unsubscribe(path, this))
  }

  execute() {
    this.effect(this.target, this.compute.call(this.host.store.data), this.payload)
  }
}


class TextDirective implements Directive, Command {

  static configure ({ type, nodePath, expression }: TextConfig): Installer {
    const compute = evaluate(expression)
    return (host: Component) => new TextDirective(host, expression.paths, compute, nodePath)
  }

  target: Text

  constructor(public host: Component, public paths: KeyPath[], public compute: Function, nodePath: NodePath) {
    this.target = resolve(host.el, nodePath) as Text
    this.execute()
    forEach(this.paths, path => this.host.store.subscribe(path, this))
  }

  destructor () {
    forEach(this.paths, path => this.host.store.unsubscribe(path, this))
  }

  execute () {
    Effects[DirectiveType.TEXT](this.target, this.compute.call(this.host.store.data))
  }
}


class ListenerDirective implements Directive {

  static configure ({ nodePath, event, expression }: ListenerConfig): Installer {
    const handler = evaluate(expression)
    return (host: Component) => new ListenerDirective(host, event, handler, nodePath)
  }

  target: Node

  proxy: EventListener

  constructor(
    public host: Component,
    public event: string,
    handler: Function,
    nodePath: NodePath
  ) {
    this.target = resolve(this.host.el, nodePath);
    this.proxy = () => handler.call(this.host)
    this.target.addEventListener(this.event, this.proxy, false)
  }

  destructor () {
    this.target.removeEventListener(this.event, this.proxy, false)
  }
}

/* -----------------------------------------------------------------------------
 * component stuff
 */

const configurers: Record<TopLevelDirective, (config: DirectiveConfig) => Installer> = {
  [DirectiveType.IF]: IfDirective.configure,
  [DirectiveType.FOR]: ForDirective.configure,
  [DirectiveType.TEXT]: TextDirective.configure,
  [DirectiveType.SLOT]: SlotDirective.configure,
  [DirectiveType.STYLE]: SetterDirective.configure,
  [DirectiveType.SWITCH]: SwitchDirective.configure,
  [DirectiveType.DATASET]: SetterDirective.configure,
  [DirectiveType.PROPERTY]: SetterDirective.configure,
  [DirectiveType.ATTRIBUTE]: SetterDirective.configure,
  [DirectiveType.CLASSNAME]: SetterDirective.configure,
  [DirectiveType.LISTENER]: ListenerDirective.configure,
  [DirectiveType.REFERENCE]: ReferenceDirective.configure,
  [DirectiveType.COMPONENT]: ComponentDirective.configure,
}

class Component implements Directive {

  static configure (template: Template, tag: string = '#partial', state?: Function) {
    const installers = map(template.directives, dir => configurers[dir.type](dir))
 
    return (host: Component | null, props?: Record<string, any>, slots?: Record<string, Component>) =>
      new Component(host, tag, template.el, installers, props, state, slots)
  }

  el: Node
  
  refs: Record<string, Node | Node[] | null>
  
  store: Store
  
  directives: Directive[]

  constructor(
    public host: Component | null,
    public tag: string,
    template: Node,
    installers: Installer[],
    props?:  Record<string, any>,
    state?: Function,
    public slots?: Record<string, Component>,
  ) {
    this.el = clone(template)
    this.refs = {}
    // TODO: create the "NullStore" that throws on any interaction
    this.store = state
      ? props // components
        ? new Store(extend(props, state()))
        : new Store(state())
      : props // partials
        ? new StoreLayer(props, host.store) // repeatables
        : host.store // slots, if/elif/else, switch-cases

    debugger
    this.directives = map(installers, install => install(this))
  }

  destructor () {
    if (this.slots) forOwn(this.slots, slot => { slot.destructor() })
    forEach(this.directives, task => task.destructor())
    return this
  }

  mount (node: Node) {
    replaceNode(node, this.el)
    return this
  }

  merge (src: any) {
    this.store.merge(src)
    this.store.update()
    return this
  }
}

export const configure = Component.configure

export type ComponentFactory = ReturnType<typeof configure>
