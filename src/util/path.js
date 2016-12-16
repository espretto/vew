
import { Error } from './global'
import { hasOwn } from './object'
import { isObject, isArray } from './type'

/**
 * has own property or index
 * @param  {*}  object 
 * @param  {string|number}  key
 * @return {bool}
 */
export function has (object, key) {
  return isObject(object) && (isArray(object)
    ? key < object.length
    : hasOwn.call(object, key)
  )
}

/**
 * parse string to corresponding key-chain
 * @param  {string} str
 * @return {array}
 */
const reUnescapeQuotes = /\\('|")/g

const rePickKeys = /\[('|")((?:\\\1|[^\1])*)\1\]|\[(\d+)|(?:^|\.)([^\.\[]*)/g

export function toPath (str) {
    
  if (isArray(str)) {
    return str
  }
  else if (!str) {
    return []
  }
  else if (str.indexOf('[') < 0) {
    return str.split('.')
  }
  
  var keys = []

  str.replace(rePickKeys, function (match, quote, string, index, key) {
    keys.push(
      quote ? string.replace(reUnescapeQuotes, '$1') :
      index ? +index : key
    )
  })

  return keys
}

/**
 * resolve key chain
 * @param  {object} object
 * @param  {array} path
 * @return {*}
 */
export function resolve (object, path) {
	var len = path.length
		, i = -1
		, key

	while (++i < len) {
		key = path[i]

		if (has(object, key)) {
			object = object[key]
		}
		else if (DEBUG) {
			throw new Error('cannot resolve path \n\n' + [].concat('^', path, '$').join(' -> '))
		}
	}

	return object
}