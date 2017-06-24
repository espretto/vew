
// import { global } from './global'

const queue = []

const MutationObserver = global.MutationObserver || global.WebKitMutationObserver

const scheduleFlush = MutationObserver
  ? useMutationObserver(flush)
  : useSetTimeout(flush)

export default function asap (func, payload) {
  const length = queue.push( { func, payload } )
  
  if (length === 1) {
    scheduleFlush()
  }
}

function flush () {
  // [TODO] pool microtasks
  for (var microtask; microtask = queue.shift();) {
    microtask.func(microtask.payload)
    microtask.func =
    microtask.payload = null
  }
}

function useSetTimeout (flush) {
  return function () {
    setTimeout(flush, 1)
  }
}

function useMutationObserver (flush) {
  var swap = 1
    , node = document.createTextNode('')
    , observer = new MutationObserver(flush)

  observer.observe(node, { characterData: true })

  return function () {
    node.data = (swap = -swap)
  }
}
