
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
 * the last key of affected paths will be preserved. example:
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
const assops = '+-^&|%*/'

/** used to lookup comparison e.g. `foo <= 2` */
const comops = '<!>'

/** preserved keywords in expressions */
const keywords = 'false|in|instanceof|new|null|true|typeof|void'

/**
 * find
 * @param  {string} string
 * @param  {regex} regex 
 * @param  {number} nextIndex
 * @return {string}
 */
find.lastIndex = 0 // JIT: preset

function find (string, nextIndex, regex) {
  regex.lastIndex = nextIndex
  
  var match = regex.exec(string)

  if (match) {
    find.lastIndex = regex.lastIndex
    return match[0]
  }
  else {
    find.lastIndex = string.length
    return '' // JIT: monomorphism
  }
}


mangle.lastIndex = 0 // JIT: preset

function mangle (input, nextIndex, paths) {
  var key = find(input, nextIndex, matchIdent)
    , length = input.length
    , appendix = ''
    , chain, char, pendIndex

  // early exit for allowed keywords
  if (keywords.indexOf(key) > -1) {
    mangle.lastIndex = find.lastIndex
    return key
  }

  chain = [key]
  nextIndex = find.lastIndex

  while (nextIndex < length) {

    // skip whitespace
    char = find(input, nextIndex, noWhitespace)
    nextIndex = find.lastIndex

    // dot notation
    if (char === '.') {

      // skip whitespace
      if (!find(input, nextIndex, noWhitespace)) {
        if (DEBUG) throw new Error(`missing name after . operator\n > ${input}`)
      }

      // find chain key, reconsume non-whitespace character
      key = find(input, find.lastIndex-1, matchIdent)

      if (!key) {
        if (DEBUG) throw new Error(`missing name after . operator\n > ${input}`)
      }

      chain.push(key)
      nextIndex = find.lastIndex
    }
    // bracket notation
    else if (char === '[') {

      // skip whitespace
      char = find(input, nextIndex, noWhitespace)
      nextIndex = find.lastIndex

      // string notation
      if (char === '"' || char === "'") {
        pendIndex = nextIndex
        nextIndex = indexOfUnescaped(input, char, pendIndex)

        if (nextIndex < 0) {
          if (DEBUG) throw new Error(`unterminated string literal\n > ${input}`)
          break
        }

        key = input.substring(pendIndex, nextIndex)
        chain.push(key)

        // skip the single-/double-quote
        nextIndex += 1

        // bail out if this is a more complex expression than a simple string
        char = find(input, nextIndex, noWhitespace)
        nextIndex = find.lastIndex

        if (char !== ']') {
          appendix = `["${chain.pop()}"`
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
    else if (char === '(' && chain.length > 1) {
      key = chain.pop()

      // if it's a valid identifier we can use dot-notation
      appendix = key.match(matchIdent)[0].length === key.length ? '.${key}' : `["'${key}'"]`
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
  var index = findIndex(paths, other => eqArray(chain, other))
  if (index < 0) {
    index = paths.push(chain) - 1
  }

  return (IDENT_PREFIX + index) + appendix
}

export function parse (input, nextIndex, suffix) {
  var output = ''
    , paths = []

    // parser state
    , nextIndex = +nextIndex || 0
    , pendIndex = nextIndex
    , lastIndex = -1
    , brackets = []
    , inValue = false
    , length = input.length
    , char, next

  while (nextIndex < length) {

    /* -------------------------------------------------------------------------
     * skip whitespace, numbers, strings and regular expressions
     * (anything that would otherwise be falsely recognized as part of a key-chain)
     */
    char = find(input, nextIndex, noWhitespace)
    nextIndex = find.lastIndex

    if (passNumber.test(char)) {
      find(input, nextIndex, noNumber)
      nextIndex = find.lastIndex - 1
    }
    else if (char === '"' || char === "'" || char === '/') {

      if (DEBUG && char === '/') {
        next = input.charAt(nextIndex)

        if (next === '=') {
          throw new Error(`assignments are not allowed\n > ${input}`)
        }
        else if (next === '/' || next === '*') {
          throw new Error(`comments are not allowed\n > ${input}`)
        }
      }

      nextIndex = indexOfUnescaped(input, char, nextIndex)
      if (nextIndex < 0) {
        if (DEBUG) throw new Error(`unterminated ${char === '/' ? 'regex' : 'string'} literal\n > ${input}`)
        break
      }
      nextIndex += 1 // skip quote or slash
    }
    /* -------------------------------------------------------------------------
     * break on expression suffix
     */
    else if (suffix && !brackets.length && startsWith(input, suffix, nextIndex - 1)) {
      lastIndex = nextIndex - 1
      break
    }
    /* -------------------------------------------------------------------------
     * track object literals to avoid mangling their keys
     * (needs to disambiguate the meaning of a comma)
     */
    else if (char === '(' || char === '[' || char === '{') {
      brackets.push(char)
      inValue = false
    }
    else if (char === ')' || char === ']' || char === '}') {
      brackets.pop()
    }
    else if (char === ':') {
      inValue = true
    }
    else if (char === ',') {
      inValue = false
    }
    /* -------------------------------------------------------------------------
     * mangle and record key-chains
     */
    else if (passIdent.test(char)) {

      // reconsume current character
      nextIndex -= 1

      // protect keys of object literals
      if (!inValue && last(brackets) === '{') {
        find(input, nextIndex, matchIdent)
        nextIndex = find.lastIndex
      }
      else {
        // append what we skipped up until now
        if (pendIndex < nextIndex) {
          output += input.substring(pendIndex, nextIndex)
          // due update of `pendIndex` follows
        }

        // append chain replacement
        output += mangle(input, nextIndex, paths)

        // set indices to continue after the chain
        nextIndex = pendIndex = mangle.lastIndex
      }
    }
    /* -------------------------------------------------------------------------
     * skip key-chains of runtime values
     */
    else if (char === '.') {
      
      if (!find(input, nextIndex, noWhitespace)) {
        if (DEBUG) throw new Error(`missing name after . operator\n > ${input}`)
        break
      }

      // reconsume previously found non-whitespace character
      nextIndex = find.lastIndex - 1

      // skip chain key or continue to handle floating point number
      matchIdent.lastIndex = nextIndex
      var match = matchIdent.exec(input)
      if (match && match.index === nextIndex) {
        nextIndex = matchIdent.lastIndex
      }
    }
    /* -------------------------------------------------------------------------
     * enforce limited expression syntax forbidding assignments and semicola
     */
    else if (DEBUG) {
      next = input.charAt(nextIndex)

      if (char === '=') {
        if (next === '=') {
          nextIndex += 1
          if (input.charAt(nextIndex) === '=') {
            nextIndex += 1
          }
        }
        else {
          throw new Error(`assignments not allowed\n > ${input}`)
        }
      }
      else if (char === '+' || char === '-') {
        if (next === char) {
          throw new Error(`assignments not allowed\n > ${input}`)
        }
        nextIndex += 1
      }
      else if (assops.indexOf(char) > -1) {
        if (next === '=') {
          throw new Error(`assignments not allowed\n > ${input}`)
        }
        nextIndex += 1
      }
      else if (comops.indexOf(char) > -1 && next === '=') {
        nextIndex += 1
      }
      else if (char === '>' && next === '>') {
        nextIndex += 1
        next = input.charAt(nextIndex)
        if (next === '=') {
          throw new Error(`assignments not allowed\n > ${input}`)
        }
        else if (next === '>') {
          nextIndex += 1
          next = input.charAt(nextIndex)
          if (next === '=') {
            throw new Error(`assignments not allowed\n > ${input}`)
          }
        }
      }
      else if (char === '<' && next === '<') {
        nextIndex += 1
        next = input.charAt(nextIndex)
        if (next === '=') {
          throw new Error(`assignments not allowed\n > ${input}`)
        }
      }
      else if (char === ';') {
        throw new Error(`statements are not allowed\n > ${input}`)
      }
    }
  }

  if (lastIndex < 0) throw new Error(`unterminated template expression\n > ${input}`)

  // flush remaining output
  if (pendIndex < length) {
    output += input.substring(pendIndex, lastIndex)
  }

  return { paths, source: output.trim(), lastIndex }
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
 * serialize an expression to function wrapped output code
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