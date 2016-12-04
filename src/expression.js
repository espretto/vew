
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

import { id } from './util/function'
import { Error } from './util/global'
import { isArray } from './util/type'
import { findIndex, map, eqArray, last } from './util/array'

/** used to prefix mangled identifiers */
const IDENT_PREFIX = '$'

/** used to compare to and reuse the id function instead of re-evaluating it */
const ID_SOURCE = IDENT_PREFIX + '0'

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
const beforeAssignOps = '^&|%*/'

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
 * indexOfUnescaped - find index of first unescaped occurence of `chr`
 * @param  {string} string
 * @param  {string} chr
 * @param  {number} offset
 * @return {number}
 */
function indexOfUnescaped (string, chr, offset) {
  var index

  while (true) {
    index = string.indexOf(chr, offset)

    if (index < 1) return index
    
    if (input.charAt(index-1) === '\\') {
      offset = index + 1
    }
    else {
      break
    }
  }

  return index
}

/**
 * findMatch
 * @param  {string} string
 * @param  {regex} regex 
 * @param  {number} offset
 * @return {string}
 */
findMatch.lastIndex = 0 // JIT: preset

function findMatch (string, regex, offset) {
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


parsePath.lastIndex = 0 // JIT: preset

function parsePath (input, nextIndex, paths) {
  var appendix = ''
    , segment = findMatch(input, matchIdent, nextIndex)
    , length = input.length
    , path, chr

  // early exit for allowed keywords
  if (allowedKeywords.hasOwnProperty(segment)) {
    parsePath.lastIndex = findMatch.lastIndex
    return segment
  }

  path = [segment]
  nextIndex = findMatch.lastIndex

  while (nextIndex < length) {

    // skip whitespace
    chr = findMatch(input, noWhitespace, nextIndex)
    nextIndex = findMatch.lastIndex

    // dot notation
    if (chr === '.') {

      // skip whitespace
      if (!findMatch(input, noWhitespace, nextIndex)) {
        if (DEBUG) throw Error('missing name after . operator\n\n' + input)
        else break
      }

      // findMatch path segment, reconsume non-whitespace character
      segment = findMatch(input, matchIdent, findMatch.lastIndex-1)

      if (!segment) {
        if (DEBUG) throw Error('missing name after . operator\n\n' + input)
        else break
      }

      path.push(segment)
      nextIndex = findMatch.lastIndex
    }
    // bracket notation
    else if (chr === '[') {

      // skip whitespace
      chr = findMatch(input, noWhitespace, nextIndex)
      nextIndex = findMatch.lastIndex

      // string notation
      if (chr === '"' || chr === "'") {
        var pendingIndex = nextIndex
        nextIndex = indexOfUnescaped(input, chr, pendingIndex)

        if (nextIndex < 0) {
          if (DEBUG) throw Error('unterminated string literal\n\n' + input)
          else break
        }

        segment = input.substring(pendingIndex, nextIndex)
        path.push(segment)

        // skip the single-/double-quote
        nextIndex += 1

        // bail out if this is a more complex expression than a simple string
        chr = findMatch(input, noWhitespace, nextIndex)
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
  
  parsePath.lastIndex = nextIndex

  // deduplicate in O(n*m) - opt for a trie structure instead
  var index = findIndex(paths, other => eqArray(path, other))
  if (index < 0) {
    index = paths.push(path) - 1
  }

  return (IDENT_PREFIX + index) + appendix
}

export function mangle (input) {
  var output = ''
    , paths = []

    // avoid mangling object keys
    , inValue = false
    , brackets = []

    // loop vars
    , pendingIndex = 0
    , nextIndex = 0
    , length = input.length
    , chr

  while (nextIndex < length) {

    // skip whitespace
    chr = findMatch(input, noWhitespace, nextIndex)
    nextIndex = findMatch.lastIndex

    // skip numbers
    if (passNumber.test(chr)) {
      findMatch(input, noNumber, nextIndex)
      nextIndex = findMatch.lastIndex
    }
    // skip strings
    else if (chr === '"' || chr === "'") {
      nextIndex = indexOfUnescaped(input, chr, nextIndex)

      if (nextIndex < 0) {
        if (DEBUG) throw Error('unterminated string literal\n\n' + input)
        else break
      }

      nextIndex += 1
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
    // parse key-chains
    else if (passIdent.test(chr)) {

      // reconsume current character
      nextIndex -= 1

      // protect keys of object literals
      if (inValue || last(brackets) !== '{') {

        // output what we skipped up until now
        if (pendingIndex < nextIndex) {
          output += input.substring(pendingIndex, nextIndex)
          // due update of `pendingIndex` follows
        }

        // append path replacement
        output += parsePath(input, nextIndex, paths)

        // set indices to continue after the path
        nextIndex = pendingIndex = parsePath.lastIndex
      }
      // skip keys of object literals
      else {
        findMatch(input, matchIdent, nextIndex)
        nextIndex = findMatch.lastIndex
      }
    }
    // skip follow-ups of dynamic paths that `parsePath` bailed out of.
    // example: `prop` in `object[condition ? foo : bar].prop`
    // property access via strings is handled by string skipping
    else if (chr === '.') {
      
      if (!findMatch(input, noWhitespace, nextIndex)) { // eof
        if (DEBUG) throw Error('missing name after . operator\n\n' + input)
        else break
      }

      // reconsume previous non-whitespace character
      nextIndex = findMatch.lastIndex-1

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
          throw Error('assignments not allowed\n\n' + input)
        }

        // skip strict equals
        if (input.charAt(nextIndex+1) === '=') {
          nextIndex += 2
        }
      }
      // catch post-/prefix-increment and assignments
      else if (chr === '+' || chr === '-') {
        next = input.charAt(nextIndex)
        if (next === chr || next === '=') {
          throw Error('assignments not allowed\n\n' + input)
        }
      }
      // catch right shift assignments
      else if (chr === '>' && input.charAt(nextIndex) === '>') {
        next = input.charAt(nextIndex+1)
        if (next === '=' || next === '>' && input.charAt(++nextIndex + 1) === '=') {
          throw Error('assignments not allowed\n\n' + input)
        }
      }
      // catch left shift assignments
      else if (
        chr === '<' &&
        input.charAt(nextIndex) === '<' &&
        input.charAt(nextIndex+1) === '='
      ) {
        throw Error('assignments not allowed\n\n' + input)
      }
      // catch other assignments
      else if (
        beforeAssignOps.indexOf(chr) > -1 &&
        input.charAt(nextIndex) === '='
      ) {
        throw Error('assignments not allowed\n\n' + input)
      }
      // catch statements
      else if (chr === ';') {
        throw Error('statements are not allowed\n\n' + input)
      }
      // catch comments
      else if (chr === '/') {
        next = input.charAt(nextIndex)
        if (next === '/' || next === '*') {
          throw Error('comments are not allowed\n\n' + input)
        }
      }
    }
  }

  // flush remaining output
  if (pendingIndex < length) {
    output += input.substring(pendingIndex)
  }

  return { paths, source: output.trim() }
}

/**
 * getSignatureOf
 * @param  {expression} expression
 * @return {array}
 */
function getSignatureOf (expression) {
  return map(expression.paths, (_, nextIndex) => IDENT_PREFIX + nextIndex)
}

/**
 * evaluate
 * @param  {expression} expression
 * @return {function}
 */
export function evaluate (expression) {
  var source = expression.source

  if (source === ID_SOURCE) {
    return id
  }
  else {
    var signature = getSignatureOf(expression)
    signature.push('return ' + source)
    return Function.apply(null, signature)
  }
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