/* @flow */

import Base from './util/base'
import Scope from './scope'
import { Error } from './util/global'
import { hasOwn } from './util/object'
import { indexOf, forEach, map } from './util/array'
import { replaceNode, clone } from './dom'

class Component {

  parent: Component

  scope: Scope

  template: Node

  constructor (parent: Component) {
    this.parent = parent
    this.scope = new Scope()
    this.template = clone(this.template)

    // mount child-components
    // pass down scope
    // register event handlers in central delegate registry
    // register subscriptions to view-model
    // and create/finalize child-component prototypes
  }

  mount (node: Node) {
    replaceNode(node, this.template)
    return this
  }

  setState (obj: any) {
    this.scope.merge(obj)
    setTimeout(() => { this.scope.update() })
    return this
  }

  finalize () {
    // transclude slots
    return this
  }

  transclude () {
    // fill in missing slot / replace default ones
  }
}

export default Component

/*
<component>
  <span --slot="name">
    <component>
      <span --slot="name">
        <span>${name}</span>
      </span>
    </component>
  </span>
</component>
*/