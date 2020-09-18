/* @flow */

import Registry from './registry'
import Template from './template'
import { parse } from './dom/html'
import { isString } from './util/type'
import { bootstrapComponent } from './component'

type ComponentOptions = {
  el: string | Element,
  tag?: string,
  data?: Function,
  template: string | Element
};

export function Component (options: ComponentOptions) {
  const { el, ...proto } = options
  const createComponent = Component.extend(proto)

  if (el) {
    const target = typeof el === 'string' ? document.querySelector(el) : el
    return createComponent(null).mount(target)
  }
}

Component.extend = function ({ tag, data, template }: ComponentOptions) {
  let tmpl

  if (isString(template)) {
    const frag = parse(template)

    console.assert(
      frag.firstChild.nodeType === 1 && frag.firstChild === frag.lastChild,
      'component template must have a single root element node'
    )

    tmpl = new Template(frag.removeChild(frag.firstChild))
  }
  else {
    tmpl = template
  }

  if (!data) {
    data = () => ({})
  }

  const createComponent = bootstrapComponent(tmpl, data)

  if (tag) {
    Registry[tag.toUpperCase()] = createComponent
  }

  return createComponent
}
