
import { fold } from '../util/array'
import { isObject } from '../util/type'
import { keys } from '../util/object'
import { kebabCase } from '../util/string'

export const MUTATORS = {
  MOUNT_COMPONENT:  'MOUNT_COMPONENT'
, MOUNT_CONDITION:  'MOUNT_CONDITION'
, MOUNT_LOOP:       'MOUNT_LOOP'
, SET_BOOLEAN_PROP: 'SET_BOOLEAN_PROPERTY'
, SET_CLASS_NAME:   'SET_CLASS_NAME'
, SET_CSS_TEXT:     'SET_CSS_TEXT'
, SET_NODE_VALUE:   'SET_NODE_VALUE'
}

function setNodeValue (node, value) {
  if (node.nodeValue !== value) {
    node.nodeValue = value
  }
}

function setClassName (node, value) {
  var className = this.initial

  if (isObject(value)) {
    forOwn(value, (active, klass) => {
      if (active) className += ' ' + klass
    })
  }
  else {
    className += ' ' + value
  }    

  if (node.className !== className) {
    node.className = className
  }
}

// [FIXME] cannot set properties "content" and "font-family" because their values contain quotes
function setCssText (node, value) {
  var cssText = this.initial

  if (isObject(value)) {
    forOwn(value, (style, prop) => {
      cssText += ';' + kebabCase(prop) + ':' + style
    })
  }
  else {
    cssText += ';' + value
  }

  if (node.style.cssText !== cssText) {
    node.style.cssText = cssText
  }
}

function setBooleanProperty (node, value) {
  node[this.initial] = !!value
}
