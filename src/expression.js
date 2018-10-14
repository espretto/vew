/* @flow */

import type { Path } from './util/path'

export type Expression = {|
  paths: Path[],
  source: string,
  begin: number,
  end: number
|}

import { hasOwn } from './util/object'
import { trim, chr } from './util/string'
import { indexOf, findIndex, map, range } from './util/array'

/** used to match the first character of a javascript identifier or keyword */
const passIdent = /[a-zA-Z_$]/

/** used to match javascript identifiers and keywords */
const matchIdent = /[a-zA-Z_$][\w$]*/g

/** used mangle identifiers */
const toIdent = index => chr(97 + index)

/** used to skip whitespace */
const noWs = /\S/g

/** used to skip numbers (bin, oct, hex, exp) */
const noNum = /[^a-fox\d]/gi

/** preserved keywords in expressions (operators and values only) */
const keywords = 'false,in,instanceof,new,null,true,typeof,void'.split(',')

/** used match the first character of a possibly forbidden operator */
const beginOperator = '=+-*/|&^<!>'

/** used to match javascript operators (debug) */
const matchOperator = /[\+\-]{2}|[\+\-\*\/\^\&\|<%>]=|=>|={1,3}|!==?|<<=?|>>>?=?/g

/** used to look up forbidden operators */
const assignOperators = '=,++,--,+=,-=,*=,/=,|=,&=,^=,%=,<<=,>>=,>>>='.split(',')

/* -----------------------------------------------------------------------------
 * expression scanner
 */
class Scanner {

  /** parser index */
  index: number

  /** input source code */
  input: string

  /** input delimiter */
  suffix: string

  /** pending index used for buffering, copying parts from input to output */
  anchor: number

  /** used to keep track of brackets/braces/parentheses */
  brackets: string[]

  /** indicates whether the current identifier could be an object key */
  maybeKey: boolean

  /** result: array of key-chains being collected */
  match: Expression

  constructor () {
    this.index = 0
    this.input = ''
    this.suffix = ''
    this.anchor = 0
    this.brackets.length = 0
    this.maybeKey = false
    this.match = {
      paths: [],
      source: '',
      begin: 0,
      end: 0
    }
  }

  /* ---------------------------------------------------------------------------
   * parser utilities
   */
  buffer () {
    this.anchor = this.index
  }

  flush () {
    if (this.anchor < this.index) {
      this.match.source += this.input.substring(this.anchor, this.index)
      this.anchor = this.index
    }
  }

  seek (regex: RegExp, skip: boolean = false) {
    if (skip) this.index += 1
    regex.lastIndex = this.index
    const match = regex.exec(this.input)

    if (match) {
      this.index = match.index
      return match[0]
    }
    else {
      this.index = this.input.length
      return '' // JIT: monomorphism
    }
  }

  seekEndOfString (quote: string) {
    this.index += 1

    // skip empty string literal
    if (this.input.charAt(this.index) !== quote) {

      // seek unescaped quote
      do this.index = this.input.indexOf(quote, this.index)
      while (this.input.charAt(this.index - 1) === '\\' && ++this.index)

      // unterminated string literal
      if (this.index < 0) {
        throw new Error('unterminated string literal')
      }
    }

    this.index += 1
  }

  hasReachedSuffix () {
    return (
      this.suffix &&
      this.brackets.length === 0 &&
      this.input.lastIndexOf(this.suffix, this.index) === this.index
    )
  }

  addPath (path: Path) {
    var index = findIndex(this.match.paths, other => other.join() === path.join())
    if (index < 0) index = this.match.paths.push(path) - 1
    this.match.source += toIdent(index)
  }

  /* ---------------------------------------------------------------------------
   * parser state tree (no recursion)
   *
   * dataState
   * - slashState
   * - identState
   *   - pathState
   *     - dotState
   *     - bracketOpenState
   *       - bracketCloseState
   * - dotState
   * - [debugState]
   */
  dataState () {
    var length = this.input.length
      , index, chr

    this.buffer()

    while (this.index < length) {
      index = this.index
      chr = this.seek(noWs)

      if (this.hasReachedSuffix()) {
        break
      }
      else if (isFinite(chr)) { // never whitespace
        this.seek(noNum, true)
      }
      else if (chr === '/') {
        this.slashState()
      }
      else if (chr === '"' || chr === "'") {
        this.seekEndOfString(chr)
      }
      else if (chr === '(' || chr === '[' || chr === '{') {
        this.brackets.unshift(chr)
        this.maybeKey = true
      }
      else if (chr === ')' || chr === ']' || chr === '}') {
        this.brackets.shift()
      }
      else if (chr === ':') {
        this.maybeKey = false
      }
      else if (chr === ',') {
        this.maybeKey = true
      }
      else if (passIdent.test(chr)) {
        this.identState()
      }
      else if (chr === '.') {
        this.dotState()
      }
      else {
        this.checkState(chr)
      }

      // ensure increment
      if (this.index === index) this.index += 1
    }

    this.flush()
  }

  slashState () {
    var chr = this.input.charAt(++this.index)

    if (chr === '/' || chr === '*') {
      throw new Error('comments not allowed')
    }
    else if (chr === '=') {
      throw new Error('assignments not allowed')
    }
    else {
      throw new Error('divisions cannot be distinguished from ')
    }
  }

  identState () {
    const ident = this.seek(matchIdent)

    if (this.maybeKey && this.brackets[0] === '{') {
      this.index += ident.length
      this.flush()

      if (this.seek(noWs) !== ':') {
        this.match.source += ':'
        this.addPath( [ident] )
      }
    }
    else if (indexOf(keywords, ident) < 0) {
      this.flush()
      this.index += ident.length
      this.pathState( [ident] )
    }
    else {
      this.index += ident.length
      this.flush()
    }
  }

  pathState (path: Path) {
    var length = this.input.length
      , chr

    while (this.index < length) {
      chr = this.seek(noWs)

      if (chr === '.') {
        this.buffer()
        this.dotState(path)
      }
      else if (chr === '[') {
        this.buffer()
        if (this.bracketOpenState(path)) break
      }
      // preserve this-bindings of function calls
      else if (chr === '(' && path.length > 1) {
        path.pop()
        break
      }
      else {
        this.buffer()
        break
      }
    }

    // else to the while
    if (this.index === length) this.buffer()

    this.addPath(path)
    this.flush()
  }

  dotState (path?: Path) {
    var chr = this.seek(noWs, true)
      , ident

    if (passIdent.test(chr)) {
      ident = this.seek(matchIdent)
      this.index += ident.length
      if (path) path.push(ident)
    }
    else if (!isFinite(chr)) { // never whitespace
      throw new Error('missing name after dot operator')
    }
  }

  /**
   * returns true if the enclosed expression is dynamic
   * i.e. cannot be statically resolved
   */
  bracketOpenState (path: Path) {
    var chr = this.seek(noWs, true)
      , begin, ident

    if (chr === '"' || chr === "'") {
      begin = this.index
      this.seekEndOfString(chr)
      ident = this.input.substring(begin+1, this.index-1) // trim quotes
      path.push(ident)

      return this.bracketCloseState(path)
    }
    else if (isFinite(chr)) { // never whitespace
      begin = this.index
      this.seek(noNum, true)

      ident = this.input.substring(begin, this.index)
      path.push(ident)

      return this.bracketCloseState(path)
    }
    else if (!chr) {
      throw new Error('expected expression, got end of script')
    }
    // do not support keyword values as accessors (true, false, null, etc.)

    return true
  }

  /**
   * returns true if the enclosed expression is dynamic
   * i.e. cannot be statically resolved
   */
  bracketCloseState (path: Path) {
    var chr = this.seek(noWs)

    if (!chr) {
      throw new Error('expected expression, got end of script')
    }
    else if (chr === ']') {
      this.index += 1
      return false
    }
    else {
      path.pop()
      return true
    }
  }

  checkState (chr: string) {
    if (chr === ';') {
      throw new Error('statements are not allowed')
    }
    else if (beginOperator.indexOf(chr) > -1) {
      matchOperator.lastIndex = this.index
      var match = matchOperator.exec(this.input)

      if (match && match.index === this.index) {
        var operator = match[0]

        if (operator === '=>') {
          throw new Error('arrow operator not supported')
        }
        else if (indexOf(assignOperators, operator) > -1) {
          throw new Error('assignments are not allowed')
        }
        else {
          // case: <<, >>, >>>, <=, >=, ==, !=, ===, !==
          this.index += operator.length
        }
      }
    }
  }
}

export function evaluate (match: Expression): Function {
  const signature = map(range(match.paths.length), toIdent)
  signature.push('return ' + match.source)
  // flowignore: await constructor type definition
  return Function.apply(null, signature)
}

export function scan (input: string, delimiters?: [string, string]): ?Expression {
  const [prefix, suffix] = delimiters || ['', '']
  const begin = input.indexOf(prefix)

  if (begin < 0) return null

  const scanner = new Scanner()

  scanner.index = begin + prefix.length
  scanner.input = input
  scanner.suffix = suffix

  scanner.dataState()

  scanner.match.begin = begin
  scanner.match.end = scanner.index + suffix.length

  return scanner.match
}
