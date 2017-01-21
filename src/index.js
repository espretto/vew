

import registry from './registry'
import Component from './component'

function Vew (proto) {
  const Comp = Component.derive(proto)

  if (Comp.tag) {
    registry[Comp.tag.toLowerCase()] = Comp
  }

  Comp.bootstrap()

  return Comp
}

Vew.registry = registry


/*
  example:
    
    var Greet = Vew({
      tag: 'greet',
      template: 'Hello there!'
    })

    var App = Vew({
      replace: false,
      template: '<p><greet></greet></p>'
    })

    var app = App.create().mount(document.body)

  example:
  
    var Cowsay = Vew({
      replace: false,
      template: '${name} says Moo!'
    })

    var cowsay = Cowsay.create().mount(document.body)

    cowsay.set({ name: 'Bob' })
    cowsay.set('name', 'Alice')
 */

export default Vew
