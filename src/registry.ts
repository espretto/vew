import type { componentFactory } from './component'

type Registry = { [tag: string]: componentFactory };

const registry: Registry = {}

export default registry
