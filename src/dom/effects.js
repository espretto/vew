
import { isObject } from '../util/type'
import { forOwn } from '../util/object'
import { kebabCase } from '../util/string'
import { InstructionType } from '../instruction'

export default {
  [InstructionType.TEXT]: (node, value) => {
    if (node.nodeValue !== value) {
      node.nodeValue = value
    }
  },

  [InstructionType.PROPERTY]: (node, value, property) => {
    if (!!node[property] !== !!value) {
      node[property] = !!value
    }
  },

  [InstructionType.ATTRIBUTE]: (node, value, attribute) => {
    if (node.getAttribute(attribute) !== value) {
      node.setAttribute(attribute, value)
    }
  },

  [InstructionType.DATASET]: (node, value, key) => {
    if (node.getAttribute('data-' + key) !== value) {
      node.setAttribute('data-' + key, value)
    }
  },

  [InstructionType.CLASSNAME]: (node, value, className) => {
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
  },

  // [FIXME] cannot set properties "content" and "font-family" because their values contain quotes
  [InstructionType.STYLE]: (node, value, cssText) => {
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
}
