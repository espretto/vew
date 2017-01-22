

import registry from './registry'
import Component from './component'

function Vew (proto) {
  const Comp = Component.derive(proto)

  if (Comp.tag) {
    registry[Comp.tag.toUpperCase()] = Comp
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

  example:
    
    var Greet = Vew({
      tag: 'greet',
      template: 'Hello <slot>there</slot>!'
    })

    var App = Vew({
      replace: false,
      template: '<p><greet>${name}</greet></p>'
      // template: '<p><em k-is="greet">${name}</em></p>' 
      // set { replace: false } on greet component for this to work
    })

    var app = App.create().mount(document.body)

    app.set({ name: 'Alice' })
 */

export default Vew
