
/**
 * javascript expression mangler for ES5 syntax
 *
 * mangles all statically resolvable JavaScript key-chains **including most keywords**
 * and returns the mangled source with a source-map-like array of paths.
 * paths are supposed to be resolved to values using a secure scope object
 * and passed as arguments in the same order to the evaluated source/function.
 *
 * this approach drastically reduces the complexity of the parser because
 * it does not have to create an abstract syntax tree and imposes strong
 * restrictions on the input source code.
 * 
 * function and variable declarations, flow-control statements,
 * and access to the global scope are no longer possible. keywords like
 * `this`, `arguments`, and `undefined` can be conveniently remapped to their
 * desired/secure values. to a certain degree this remedies *strict mode*.
 *
 * the parser further disallows comments, statements/semicola, and assignments
 * of all variations. in general, side-effects are not allowed.
 *
 * the parser explicitely allows keywords `null`, `true` and `false`,
 * sequences/commata, function calls and operators `typeof`, `void`,
 * `instanceof`, `new` and `in`. all other keywords will be
 * interpreted as identifiers!
 * 
 * if you wish to use one of the allowed keywords as an actual key,
 * map `this` to your root object and access properties like so: `this["new"]`
 *
 * in order for function calls to not loose their potential this-binding
 * the last segment of affected paths will be preserved. example:
 * ```
 * var expr = mangle("obj.prop.startsWith(prefix)")
 * expr.source == "$0.startsWith($1)"
 * expr.paths == [["obj", "prop"], ["prefix"]]
 * ```
 * keep this behaviour in mind if you intend to watch the given paths
 * for value-changes upon which you call the function. if you wish to *bind* 
 * to changes of the function itself, wrap it in a dedicated expression:
 * ```
 * var expr = mangle("( obj.prop.startsWith )(prefix)")
 * expr.source == "($0)($1)"
 * expr.paths == [["obj", "prop", "startsWith"], ["prefix"]]
 * ```
 * note that the above example only works (throws an error) because the
 * key-chain is completely replaced. this is more of a bug than a feature
 * because usually, to achieve the same behaviour, you would have to write
 * an expression sequence which evaluates to the function:
 * ```
 * (true, obj.prop.startsWith)(prefix) // startsWith lost its context
 * ```
 *
 * TODO:
 *   what about `array.length` as a key-chain?
 *   preserve `length` or mangle it?
 *
 * TODO:
 *   make `undefined` an optional keyword if you screw IE8
 *   
 */

import { isArray } from './util/type'
import { indexOfUnescaped, startsWith } from './util/string'
import { findIndex, map, eqArray, last } from './util/array'

/** used to prefix mangled identifiers */
const IDENT_PREFIX = '$'

/** used to mark the beginning of a number (any format except e.g. `.5`) */
const passNumber = /\d/

/** used to match the first character of a javascript identifier or keyword */
const passIdent = /[a-zA-Z\$_]/

/** used to match javascript identifiers and keywords */
const matchIdent = /[a-zA-Z\$_][\w\$]*/g

/** used to skip binary, octal, hexadecimal, decimal, floating point and exponent characters */
const noNumber = /[^\d\.a-fx]/gi

/** used to skip whitespace */
const noWhitespace = /\S/g

/** used to lookup assignments e.g. `foo %= 2` */
const beforeAssignOps = '+-^&|%*/'

const allowedKeywords =
{ 'false': 1
, 'in': 1
, 'instanceof': 1
, 'new': 1
, 'null': 1
, 'true': 1
, 'typeof': 1
, 'void': 1
}

/**
 * findMatch
 * @param  {string} string
 * @param  {regex} regex 
 * @param  {number} offset
 * @return {string}
 */
findMatch.lastIndex = 0 // JIT: preset

function findMatch (string, offset, regex) {
  regex.lastIndex = offset
  
  var match = regex.exec(string)

  if (match) {
    findMatch.lastIndex = regex.lastIndex
    return match[0]
  }
  else {
    findMatch.lastIndex = string.length
    return '' // JIT: monomorphism
  }
}


mangle.lastIndex = 0 // JIT: preset

function mangle (input, nextIndex, paths, errors) {
  var appendix = ''
    , segment = findMatch(input, nextIndex, matchIdent)
    , length = input.length
    , path, chr

  // early exit for allowed keywords
  if (allowedKeywords.hasOwnProperty(segment)) {
    mangle.lastIndex = findMatch.lastIndex
    return segment
  }

  path = [segment]
  nextIndex = findMatch.lastIndex

  while (nextIndex < length) {

    // skip whitespace
    chr = findMatch(input, nextIndex, noWhitespace)
    nextIndex = findMatch.lastIndex

    // dot notation
    if (chr === '.') {

      // skip whitespace
      if (!findMatch(input, nextIndex, noWhitespace)) {
        if (DEBUG) errors.push('missing name after . operator')
      }

      // findMatch path segment, reconsume non-whitespace character
      segment = findMatch(input, findMatch.lastIndex-1, matchIdent)

      if (!segment) {
        if (DEBUG) errors.push('missing name after . operator')
      }

      path.push(segment)
      nextIndex = findMatch.lastIndex
    }
    // bracket notation
    else if (chr === '[') {

      // skip whitespace
      chr = findMatch(input, nextIndex, noWhitespace)
      nextIndex = findMatch.lastIndex

      // string notation
      if (chr === '"' || chr === "'") {
        var pendingIndex = nextIndex
        nextIndex = indexOfUnescaped(input, chr, pendingIndex)

        if (nextIndex < 0) {
          if (DEBUG) errors.push('unterminated string literal')
          break
        }

        segment = input.substring(pendingIndex, nextIndex)
        path.push(segment)

        // skip the single-/double-quote
        nextIndex += 1

        // bail out if this is a more complex expression than a simple string
        chr = findMatch(input, nextIndex, noWhitespace)
        nextIndex = findMatch.lastIndex

        if (chr !== ']') {
          appendix = '["' + path.pop() + '"'
          nextIndex -= 1
          break
        }
      }
      else {
        appendix = '['
        nextIndex -= 1
        break
      }
    }
    // function calls - preserve potential this-binding
    else if (chr === '(' && path.length > 1) {
      segment = path.pop()

      // if it's a full match we can use dot-notation, bracket-notation otherwise
      appendix = segment.match(matchIdent)[0].length === segment.length
        ? '.' + segment
        : '["' + segment + '"]'

      nextIndex -= 1
      break
    }
    else {
      nextIndex -= 1
      break
    }
  }
  
  mangle.lastIndex = nextIndex

  // deduplicate in O(n*m) - opt for a trie structure instead
  var index = findIndex(paths, other => eqArray(path, other))
  if (index < 0) {
    index = paths.push(path) - 1
  }

  return (IDENT_PREFIX + index) + appendix
}

export function parse (input, offset, delim) {
  // output vars
  var source = ''
    , paths = []
    , errors = []
    , lastIndex = input.length

    // loop vars
    , nextIndex = +offset || 0
    , pendingIndex = nextIndex
    , length = input.length
    , chr

    // parser state
    , brackets = []
    , inValue = false

  while (nextIndex < length) {

    // skip whitespace
    chr = findMatch(input, nextIndex, noWhitespace)
    nextIndex = findMatch.lastIndex

    // skip numbers
    if (passNumber.test(chr)) {
      findMatch(input, nextIndex, noNumber)
      nextIndex = findMatch.lastIndex - 1
    }
    // skip strings and regular expressions, throw on comments
    else if (chr === '"' || chr === "'" || chr === '/') {

      // catch comments
      if (DEBUG && chr === '/') {
        var next = input.charAt(nextIndex)
        if (next === '/' || next === '*') {
          errors.push('comments are not allowed')
        }
      }

      nextIndex = indexOfUnescaped(input, chr, nextIndex)

      if (nextIndex < 0) {
        if (DEBUG) errors.push('unterminated ' + (chr === '/' ? 'regex' : 'string') + ' literal')
        break
      }

      nextIndex += 1 // skip quote or slash
    }
    // watch out for expression delimiter
    else if (delim && !brackets.length && startsWith(input, delim, nextIndex-1)) {
      lastIndex = nextIndex - 1
      break
    }
    // track object literals to avoid mangling their keys. track arrays,
    // sequences, and arguments as well to disambiguate the meaning of a comma.
    else if (chr === '(' || chr === '[' || chr === '{') {
      brackets.push(chr)
      inValue = false
    }
    else if (chr === ')' || chr === ']' || chr === '}') {
      brackets.pop()
    }
    else if (chr === ':') {
      inValue = true
    }
    else if (chr === ',') {
      inValue = false
    }
    // parse static key-chains
    else if (passIdent.test(chr)) {

      // reconsume current character
      nextIndex -= 1

      // protect keys of object literals
      if (!inValue && last(brackets) === '{') {
        findMatch(input, nextIndex, matchIdent)
        nextIndex = findMatch.lastIndex
      }
      else {
        // source what we skipped up until now
        if (pendingIndex < nextIndex) {
          source += input.substring(pendingIndex, nextIndex)
          // due update of `pendingIndex` follows
        }

        // append path replacement
        source += mangle(input, nextIndex, paths)

        // set indices to continue after the path
        nextIndex = pendingIndex = mangle.lastIndex
      }
    }
    // skip key-chains of runtime values
    else if (chr === '.') {
      
      if (!findMatch(input, nextIndex, noWhitespace)) {
        if (DEBUG) errors.push('missing name after . operator')
      }

      // reconsume previously found non-whitespace character
      nextIndex = findMatch.lastIndex - 1

      // skip path segment or continue to handle floating point number
      matchIdent.lastIndex = nextIndex
      var match = matchIdent.exec(input)
      if (match && match.index === nextIndex) {
        nextIndex = matchIdent.lastIndex
      }
    }
    // throw on comments, semicola, increments, decrements and
    // assignments of all possible variations - code fold it
    else if (DEBUG) {
      var next

      if (chr === '=') {

        // skip equals
        if (input.charAt(nextIndex) !== '=') {
          errors.push('assignments not allowed')
        }

        // skip strict equals
        if (input.charAt(nextIndex + 1) === '=') {
          nextIndex += 2
        }
      }
      // catch post-/prefix-increment and assignments
      else if ((chr === '+' || chr === '-') && input.charAt(nextIndex) === chr) {
        errors.push('assignments not allowed')
      }
      // catch right shift assignments
      else if (chr === '>' && input.charAt(nextIndex) === '>') {
        next = input.charAt(nextIndex + 1)
        if (next === '=' || next === '>' && input.charAt(++nextIndex + 1) === '=') {
          errors.push('assignments not allowed')
        }
      }
      // catch left shift assignments
      else if (
        chr === '<' &&
        input.charAt(nextIndex) === '<' &&
        input.charAt(nextIndex + 1) === '='
      ) {
        errors.push('assignments not allowed')
      }
      // catch other assignments
      else if (
        beforeAssignOps.indexOf(chr) > -1 &&
        input.charAt(nextIndex) === '='
      ) {
        errors.push('assignments not allowed')
      }
      // catch statements
      else if (chr === ';') {
        errors.push('statements are not allowed')
      }
    }
  }

  // flush remaining source
  if (pendingIndex < length) {
    source += input.substring(pendingIndex, lastIndex)
  }

  source = source.trim()

  return { source, paths, errors, lastIndex }
}

/**
 * getSignatureOf
 * @param  {expression} expression
 * @return {array}
 */
function getSignatureOf (expression) {
  return map(expression.paths, (_, i) => IDENT_PREFIX + i)
}

/**
 * evaluate
 * @param  {expression} expression
 * @return {function}
 */
export function evaluate (expression) {
  var signature = getSignatureOf(expression)
  signature.push('return ' + expression.source)
  return Function.apply(null, signature)
}

/**
 * serialize an expression to function wrapped source code
 * @param  {expression} expression
 * @param  {string} name
 * @return {string}
 */
export function serialize (expression, name) {
  var code = 'function '
  if (name) code += name
  code += '(' + getSignatureOf(expression).join(',') + ')'
  code += '{return ' + expression.source + '}'
  return code
}