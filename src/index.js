

import registry from './registry'
import Component from './component'

function Vew (proto) {
  const Comp = Component.derive(proto)

  if (Comp.tag) {
    registry[ Comp.tag.toUpperCase() ] = Comp
  }

  return Comp.bootstrap()
}

Vew.registry = registry

export default Vew
