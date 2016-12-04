

import Component from './component'
import registry from './registry'

function Vew () {
  var Custom = Component.derive.apply(Component, arguments)
	
	if (Custom.tag) {
		registry[Custom.tag] = Custom
	}

	Custom.bootstrap()
  
  return Custom
}

Vew({
	tag: 'greet'
, template: 'Hello <content></content> !'
})

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
