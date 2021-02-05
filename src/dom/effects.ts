
import { isObject } from '../util/type'
import { forOwn } from '../util/object'
import { kebabCase } from '../util/string'
import { DirectiveType } from '../directive'

type primitive = string | number | boolean

const typeParserMap = {
  'string': String,
  'number': Number,
  'boolean': Boolean
}

export default {
  [DirectiveType.TEXT]: (node: Text, value: string) => {
    if (node.nodeValue !== String(value)) {
      node.nodeValue = value
    }
  },

  [DirectiveType.PROPERTY]: (el: Element, value: primitive, property: string) => {
    const prev = el[property]
    const next = typeParserMap[typeof prev](value)

    if (prev !== next) {
      el[property] = next
    }
  },

  [DirectiveType.ATTRIBUTE]: (el: Element, value: primitive, attribute: string) => {
    if (el.getAttribute(attribute) !== String(value)) {
      // @ts-expect-error: value is cast to string
      el.setAttribute(attribute, value)
    }
  },
  
  [DirectiveType.DATASET]: (el: Element, value: primitive, key: string) => {
    if (el.getAttribute('data-' + key) !== String(value)) {
      // @ts-expect-error: value is cast to string
      el.setAttribute('data-' + key, value)
    }
  },

  [DirectiveType.CLASSNAME]: (el: Element, value: string | Record<string, boolean>, className: string) => {
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
  [DirectiveType.STYLE]: (el: HTMLElement, value: string | Record<string, string>, cssText: string) => {
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
