

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
			replace: false,
			template: 'Hello there!'
		})

		var App = Vew({
			replace: false,
			template: '<p><greet></greet></p>'
		})

		var app = App.create().mount(document.body)
 */

export default Vew
