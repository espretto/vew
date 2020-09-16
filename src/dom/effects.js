
import { isObject } from '../util/type'
import { forOwn } from '../util/object'
import { kebabCase } from '../util/string'
import { InstructionType } from '../instruction'

const typeParserMap = {
  'string': String,
  'number': Number,
  'boolean': Boolean
}

export default {
  [InstructionType.TEXT]: (node, value) => {
    if (node.nodeValue !== String(value)) {
      node.nodeValue = value
    }
  },

  [InstructionType.PROPERTY]: (el, value, property) => {
    const prev = el[property]
    const next = typeParserMap[typeof prev](value)

    if (prev !== next) {
      el[property] = next
    }
  },

  [InstructionType.ATTRIBUTE]: (el, value, attribute) => {
    if (el.getAttribute(attribute) !== String(value)) {
      el.setAttribute(attribute, value)
    }
  },

  [InstructionType.DATASET]: (el, value, key) => {
    if (el.getAttribute('data-' + key) !== String(value)) {
      el.setAttribute('data-' + key, value)
    }
  },

  [InstructionType.CLASSNAME]: (el, value, className) => {
    if (isObject(value)) {
      forOwn(value, (active, klass) => {
        if (active) className += ' ' + klass
      })
    }
    else {
      className += ' ' + value
    }    

    if (el.className !== className) {
      el.className = className
    }
  },

  // TODO: cannot set properties "content" and "font-family" because their values contain quotes
  [InstructionType.STYLE]: (el, value, cssText) => {
    if (isObject(value)) {
      forOwn(value, (style, prop) => {
        cssText += ';' + kebabCase(prop) + ':' + style
      })
    }
    else {
      cssText += ';' + value
    }

    if (el.style.cssText !== cssText) {
      el.style.cssText = cssText
    }
  }
}
