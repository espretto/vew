
// flowignore
import 'purecss'

/* -----------------------------------------------------------------------------
 * helpers
 */
const global = typeof self !== 'undefined' ? self : this

global.State = global.State || {} 

global.Util = {

  SEP: ['', '-'.repeat(40), ''].join('\n')
  
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

, isPrimitive (any) {
    switch (Util.type(any)) {
      case 'null':
      case 'undefined':
      case 'string':
      case 'number':
        return true
      default:
        return false
    }
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
, _listeners: State.listeners || (State.listeners = [])

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
    return JSON.stringify(data, this._beautify, 2)
    // .replace(/\\n/g, '\n')
  }

, _beautify (key, data) {
    if (data && data.nodeType) {
      return stringify(data)
    }
    else {
      switch (Util.type(data)) {
        case 'function':
          return data.toString()
        case 'array':
          return data.every(Util.isPrimitive)
            ? '[' + data.join(', ') + ']'
            : data
        case 'undefined':
          return '<undefined>'
        default:
          return data
      }
    }
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
import { evaluate, createExpression } from '../src/expression'
import Template from '../src/template'
import Registry from '../src/registry'
import { parse, stringify } from '../src/dom/html'

if (module.hot) {
  module.hot.accept()

  /* ---------------------------------------------------------------------------
   * hot module replacement testing - expressions
   */
  const ExpressionGround = (function (Util, state) {

    const ROOT = Util.qs('#expression')
    const DOM = {
      input: Util.qs('.input', ROOT)
    , output: Util.qs('.output', ROOT)
    }

    function update () {
      var out

      try {
        var exp = createExpression(DOM.input.value)
        out = [evaluate(exp).toString(), Util.beautify(exp)]
      }
      catch (e) {
        out = [e.message, e.stack]
      }

      DOM.output.value = out.join(Util.SEP)
    }

    return {
      save () {
        state.input = DOM.input.value
        state.output = DOM.output.value
      }

    , teardown () {
        DOM.input.value =
        DOM.output.value = ''
        Util.off(DOM.input, 'keyup')
      }

    , setup () {
        Util.on(DOM.input, 'keyup', Util.debounce(update, 200))
      }

    , load () {
        DOM.input.value = state.input
        DOM.output.value = state.output
        update()
      }
    }

  }(Util, (State.expression = {})))

  ExpressionGround.save()
  ExpressionGround.teardown()
  ExpressionGround.setup()
  ExpressionGround.load()

  /* ---------------------------------------------------------------------------
   * hot module replacement testing - template
   */
  const TemplateGround = (function (Util, state) {

    const ROOT = Util.qs('#template')
    const DOM = {
      input: Util.qs('.input', ROOT)
    , output: Util.qs('.output', ROOT)
    }

    function update () {
      console.log('updating..')
      var out

      Registry.components.DUMMY = {}

      try {
        var frag = parse(DOM.input.value)
        var componentProto = new Template(frag.removeChild(frag.firstChild))
        out = [Util.beautify(Registry), Util.beautify(componentProto)]
      }
      catch (e) {
        out = [e.message, e.stack]
      }

      DOM.output.value = out.join(Util.SEP)
    }

    return {
      save () {
        state.input = DOM.input.value
        state.output = DOM.output.value
      }

    , teardown () {
        DOM.input.value =
        DOM.output.value = ''
        Util.off(DOM.input, 'input')
      }

    , setup () {
        Util.on(DOM.input, 'input', Util.debounce(update, 200))
      }

    , load () {
        DOM.input.value = state.input
        DOM.output.value = state.output
        update()
      }
    }

  }(Util, (State.template = {})))

  TemplateGround.save()
  TemplateGround.teardown()
  TemplateGround.setup()
  TemplateGround.load()
  
}
