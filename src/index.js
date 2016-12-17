

import Component from './component'
import registry from './registry'

function Vew () {
  var CustomComp = Component.derive.apply(Component, arguments)

  CustomComp.tag = CustomComp['tag'] // GCC: export
	
	if (CustomComp.tag) {
		registry[CustomComp.tag] = CustomComp
	}

	CustomComp.bootstrap()
  
  return CustomComp
}

Vew.registry = registry


/*
	example:
		
		var App = Vew({
			replace: false,
			template: '<p><greet>${name}</greet></p>'
		})

		var app = App.new().mount(document.body)
		
		app.set({ name: 'Alice' })
		app.scope.update()

		app.set({ name: 'Bob' })
		app.scope.update()

 */

export default Vew
