
import { Error } from './global'
import { hasOwn } from './object'
import { isObject, isArray } from './type'

/**
 * has
 */
export function has (object, key) {
  return isObject(object) && (isArray(object)
    ? key < object.length
    : hasOwn.call(object, key)
  )
}

/**
 * toString
 */
function toString (path) {
  return [].concat('[', path, ']').join(' -> ')
}

/**
 * toPath
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
 * resolvePath
 */
export function resolvePath (object, path) {
	var len = path.length
		, i = -1
		, key

	while (++i < len) {
		key = path[i]

		if (has(object, key)) {
			object = object[key]
		}
		else {
			if (DEBUG) throw new Error('cannot resolve path \n\n' + toString(path))
		}
	}

	return object
}