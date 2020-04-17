/* @flow */

import type { setup } from './component'

type Registry = { [tag: string]: setup }

const registry: Registry = {}

export default registry
