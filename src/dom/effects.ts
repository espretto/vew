
import { isObject } from '../util/type'
import { forOwn } from '../util/object'
import { kebabCase } from '../util/string'
import { InstructionType } from '../instruction'

type primitive = string | number | boolean

const typeParserMap = {
  'string': String,
  'number': Number,
  'boolean': Boolean
}

export default {
  [InstructionType.TEXT]: (node: Text, value: string) => {
    if (node.nodeValue !== String(value)) {
      node.nodeValue = value
    }
  },

  [InstructionType.PROPERTY]: (el: Element, value: primitive, property: string) => {
    const prev = el[property]
    const next = typeParserMap[typeof prev](value)

    if (prev !== next) {
      el[property] = next
    }
  },

  [InstructionType.ATTRIBUTE]: (el: Element, value: primitive, attribute: string) => {
    if (el.getAttribute(attribute) !==  String(value)) {
      // @ts-ignore: value is cast to string
      el.setAttribute(attribute, value)
    }
  },
  
  [InstructionType.DATASET]: (el: Element, value: primitive, key: string) => {
    if (el.getAttribute('data-' + key) !== String(value)) {
      // @ts-ignore: value is cast to string
      el.setAttribute('data-' + key, value)
    }
  },

  [InstructionType.CLASSNAME]: (el: Element, value: string | { [className: string]: boolean }, className: string) => {
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
  [InstructionType.STYLE]: (el: HTMLElement, value: string | { [property: string]: string }, cssText: string) => {
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
