


// import Component from './component'

// function Vew (proto) {
//   const Comp = Component.derive(proto)

//   if (Comp.tag) {
//     registry[ Comp.tag.toUpperCase() ] = Comp
//   }

//   return Comp.bootstrap()
// }

import Registry from './registry'
import Template from './template'
import Scope from './scope'

export default { Registry, Template, Scope }
