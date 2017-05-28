
import { findIndex } from './util/array'

/* -----------------------------------------------------------------------------
 * helpers
 */
const Util = {

  qs: selector => document.querySelector(selector),
  qsa: selector => document.querySelectorAll(selector),
  now: Date.now,

  _listeners: [],

  on (element, event, handler) {
    this._listeners.push({ element, event, handler })
    element.addEventListener(event, handler, false)
  },

  off (element, event, handler) {
    if (handler) {
      var i = findIndex(this._listeners, listener =>
        listener.element === element &&
        listener.event === event &&
        listener.handler === handler
      )
      if (i > -1) {
        element.removeEventListener(event, handler, false)
        this._listeners.splice(i, 1)
      }
    }
    else {
      this._listeners.forEach((listener, i, listeners) => {
        if (listener.element === element && listener.event === event) {
          element.removeEventListener(event, listener.handler, false)
          listeners.splice(i, 1)
        }
      })
    }
  },

  beautify (data) {
    return JSON.stringify(data, null, 2)
  },

  debounce (func, minDelay) {
    var ctx, args, tack, timer
    
    function bounce () {
      var delay = Util.now() - tack

      if (delay < minDelay) {
        setTimeout(bounce, minDelay - delay)
      } else {
        timer = 0
        func.apply(ctx, args)
      }
    }

    return function(...args_) {
      ctx = this
      args = args_
      tack = Util.now()
      timer || (timer = setTimeout(bounce, minDelay))
    }
  },
}

/* -----------------------------------------------------------------------------
 * hot module replacement testing
 */

import Expression from './expression'

if (module.hot) {
  module.hot.accept()

  var dom = {
    input: Util.qs('#input'),
    output: Util.qs('#output')
  } 

  function update () {
    console.log('updating...')
    try {
      var exp = Expression.parse(dom.input.value)
      dom.output.value = [Expression.evaluate(exp).toString(), Util.beautify(exp)]
        .join('\n-----------------------------------\n')
    }
    catch (e) {
      dom.output.value = e.stack
    }
  }

  update()
  Util.off(dom.input, 'keyup')
  Util.on(dom.input, 'keyup', update)
}
