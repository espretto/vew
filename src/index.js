

import registry from './registry'
import Component from './component'

function Vew (proto) {
  const Comp = Component.derive(proto)

  Comp.tag = Comp['tag'] // GCC: export
	
	if (Comp.tag) {
		registry[Comp.tag] = Comp
	}

	Comp.bootstrap()
  
  return Comp
}

Vew.registry = registry


/*
	example:
		
		var App = Vew({
			replace: false,
			template: '<p><greet>${name}</greet></p>'
		})

		var app = App.create().mount(document.body)
		
		app.set({ name: 'Alice' })
		app.scope.update()

		app.set({ name: 'Bob' })
		app.scope.update()

 */

export default Vew
