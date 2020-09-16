

/*
  must-have :
    bind all event in the capture phase and immediately stopPropagation()
    since we implement capture, target and bubble phases ourselves.

  event interceptors:
  - stopPropagation($event)
  - preventDefault($event)
  - removeListener($event)

  event delegation strategy:
  - central listener registry on root-component basis
  - set a data-guid (or id or configurable) attribute/property on bound elements to index attached listeners in that registry
  - normalize event, 
  - fix mouse coordinates on events
  - fix target/srcElement ambiguity
  - fix event target text node safari bug
  - fix global event vs listener argument (IE)
  - fix keyCode vs which (IE)
  - fix relativeTarget
  - do not delegate mouse events:
      polyfill compareDocumentPosition, then Node#closest to
      fix mouseenter/mouseover and mouseleave/mouseout events
  - polyfill input event
  - replace focus and blur by focusin and blurout(?) events
  - polyfill preventDefault (returnValue property)
  - polyfill stopPropagation (cancelBubble property)
  - expose listener binding api for component scoped event handling
    of global events, say you want to bind to resize event in component
    life-cycle-hook
  - reimplement capture and bubbbling phases checking upward parentNode from the
    target for the data-guid attributes
  - does the order in which handlers were registered tell me in which order to 
    capture/bubble the event once its triggered?
*/

var EventHub = (function () {
  
  /**
   * consts & config
   */
  var registry = {}
  var guid = 0

  /**
   * working singletons
   */
  var __targets = []
  var __handlers = []

  /**
   * compatibility handlers
   */
  function fixEvent (event) {
    return event
  }relativeTarget

  function fixTarget (event) {
    return event.target
  }

  function fixRelativeTarget (event) {
    return event.relativeTarget
  }

  /**
   * central event handler
   */
  function delegate (event) {
    var event = fixEvent(event)
    var type = event.type

    // early exit if no handler is registered for the event
    if (!hasOwn(registry, type)) return

    var entries = registry[type]
    var targets = __targets // JIT: lift to scope
    var handlers = __handlers // JIT: lift to scope

    for (var target = fixTarget(event); target; target = target.parentNode) {
      var guid = target.getAttribute('data-guid')
      
      if (guid && hasOwn(entries, guid)) {
        targets.push(target)
        handlers.push(entries[guid])
      }
    }

    var len = handlers.length
    var i = len

    // capture phase
    while (i--) {
      var handler = handers[i]
      if (!handler.capture) continue
      if (handler(event) === false) event.preventDefault()
      if (event.isPropagationStopped) return
    }

    // bubble phase
    while (++i < len) {
      var handler = handers[i]
      var [listener, node] = callchain[i]
      if (handler(event) === false) event.preventDefault()
      if (event.isPropagationStopped) return
    }

    targets.length = handlers.length = 0
  }

  /* ---------------------------------------------------------------------------
   * api export
   *
   * what is it that identifies an event handler ?
   * should we store references to bound elements in a component ?
   * the component id and element NodePath combo is unique !
   * if the component instance implements the EventEmitter interface, maybe we should
   * delegate the event caught in the global hub to the component ?
   */
  return {

    /**
     * register handler on global event hub
     * @memberof EventHub
     * @param    {Element} el - target element
     * @param    {string} type - event type
     * @param    {boolean} capture - whether or not to call in capturing phase
     * @param    {Component} component - component hosting the handler
     * @param    {function} handler - listener
     */
    on: function (el, type, capture, component, handler) {
      // setup bidirectional reference
      component.listeners.push(type + ':' + guid)
      el.setAttribute('data-guid', ++guid)
      el = null // JIT: memory-leak

      // register handler
      var entries = getOwn(registry, type) || (registry[type] = {})
      entries[guid] = { capture, context, handler }
    },

    /**
     * cancel subscription on global event hub
     * @param    {string} guid
     */
    off: function (id) {
      var [type, guid] = id.split(':', 2)
      delete registry[type][guid]
    }
  }

}())