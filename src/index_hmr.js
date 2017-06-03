
import { findIndex } from './util/array'

/* -----------------------------------------------------------------------------
 * helpers
 */
const global = (0, eval)('this')

global.Util = global.Util || {

  SEP: ['', '-'.repeat(40), ''].join('\n')

, state: {}
  
  // selectors
, qs: (selector, elem) => (elem || document).querySelector(selector)
, qsa: (selector, elem) => (elem || document).querySelectorAll(selector)


  // typing
, type (any) {
    var typo = typeof any
    return (
      typo !== 'object' ? typo   :
      any === null      ? 'null' :
      Object.prototype.toString.call(any).slice(8, -1).toLowerCase()
    )
  }

  // a is equal subset of b
, isSubset (a, b) {
    var ta = Util.type(a)
      , tb = Util.type(b)

    if (ta !== tb) {
      return false
    }
    else switch (ta) {
      case 'array':
        return a.every((item, i) => Util.isSubset(item, b[i]))
      case 'object':
        return Object.keys(a).every(key => Util.isSubset(a[key], b[key]))
      case 'date':
        return a.getTime() === b.getTime()
      case 'regexp':
        return a.source === b.source
      case 'function':
        return String(a) === String(b)
      default:
        return a === b
    }
  }

  // events
, _listeners: []

, on (element, event, handler) {
    this._listeners.push({ element, event, handler })
    element.addEventListener(event, handler, false)
  }

, _off (element, event, handler, index) {
    this._listeners.splice(index, 1)
    element.removeEventListener(event, handler, false)
  }

, off (element, event, handler) {
    var subset = { element, event }
    if (handler) subset.handler = handler
    this._listeners.forEach((listener, i) => {
      if (Util.isSubset(subset, listener)) {
        this._off(element, event, listener.handler, i)
      }
    })
  }

  // json dump
, beautify (data) {
    return JSON.stringify(data, null, 2)
  }

  // timing
, now: () => new Date().getTime()

, debounce (func, minDelay) {
    var that, args, then, timer
    
    function bounce () {
      var delay = Util.now() - then

      if (delay < minDelay) {
        setTimeout(bounce, minDelay - delay)
      }
      else {
        timer = 0
        func.apply(that, args)
      }
    }

    return function(...latest) {
      that = this
      args = latest
      then = Util.now()
      timer || (timer = setTimeout(bounce, minDelay))
    }
  }
}

/* -----------------------------------------------------------------------------
 * hot module replacement testing
 */
import Expression from './expression'
import Template from './template'

if (module.hot) {
  module.hot.accept()

  /* ---------------------------------------------------------------------------
   * hot module replacement testing - expressions
   */
  const ExpressionGround = (function (Util, NS) {

    const ROOT = Util.qs('#expression')
    const DOM = {
      input: Util.qs('.input', ROOT)
    , output: Util.qs('.output', ROOT)
    }

    function update () {
      var out

      try {
        var exp = Expression.parse(DOM.input.value)
        out = [Expression.evaluate(exp).toString(), Util.beautify(exp)]
      }
      catch (e) {
        out = [e.message, e.stack]
      }

      DOM.output.value = out.join(Util.SEP)
    }

    return {
      save () {
        var ns = Util.state[NS] || (Util.state[NS] = {})
        ns.input = DOM.input.value
        ns.output = DOM.output.value
      }

    , teardown () {
        DOM.input.value =
        DOM.output.value = ''
        Util.off(DOM.input, 'keyup')
      }

    , setup () {
        Util.on(DOM.input, 'keyup', update)
      }

    , load () {
        var ns = Util.state[NS]
        DOM.input.value = ns.input
        DOM.output.value = ns.output
        update()
      }
    }

  }(Util, 'expression'))

  ExpressionGround.save()
  ExpressionGround.teardown()
  ExpressionGround.setup()
  ExpressionGround.load()

  /* ---------------------------------------------------------------------------
   * hot module replacement testing - template
   */
  const TemplateGround = (function (Util, NS) {

    const ROOT = Util.qs('#template')
    const DOM = {
      input: Util.qs('.input', ROOT)
    , output: Util.qs('.output', ROOT)
    } 

    function update () {
      var out

      try {
        var componentProto = Template.compile(DOM.input.value)
        out = [Util.beautify(componentProto)]
      }
      catch (e) {
        out = [e.message, e.stack]
      }

      DOM.output.value = out.join(Util.SEP)
    }

    return {
      save () {
        var ns = Util.state[ns] || (Util.state[NS] = {})
        ns.input = DOM.input.value
        ns.output = DOM.output.value
      }

    , teardown () {
        DOM.input.value =
        DOM.output.value = ''
        Util.off(DOM.input, 'keyup')
      }

    , setup () {
        Util.on(DOM.input, 'keyup', update)
      }

    , load () {
        var ns = Util.state[NS]
        DOM.input.value = ns.input
        DOM.output.value = ns.output
        update()
      }
    }

  }(Util, 'template'))

  TemplateGround.save()
  TemplateGround.teardown()
  TemplateGround.setup()
  TemplateGround.load()
  
}
