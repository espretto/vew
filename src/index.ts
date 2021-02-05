import Registry from './registry'
import Template from './template'
import { parse } from './dom/html'
import { isString } from './util/type'
import { configure } from './component'

interface ComponentOptions {
  el: string | Element;
  tag?: string;
  data?: Function;
  template: string | Element;
};

export function Component (options: ComponentOptions) {
  const { el, ...proto } = options
  const componentFactory = Component.extend(proto)

  if (el) {
    const target = typeof el === 'string' ? document.querySelector(el) : el
    return componentFactory(null).mount(target)
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

  const componentFactory = configure(tmpl, tag, data)

  if (tag) {
    Registry[tag.toUpperCase()] = componentFactory
  }

  return componentFactory
}
