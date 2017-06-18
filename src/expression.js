
import Base from './util/base'
import { trim, chr } from './util/string'
import { Array, isFinite } from './util/global'
import { indexOf, findIndex, eqArray } from './util/array'

/** used to match the first character of a javascript identifier or keyword */
const passIdent = /[a-zA-Z_$]/

/** used to match javascript identifiers and keywords */
const matchIdent = /[a-zA-Z_$][\w$]*/g

/** used mangle identifiers */
const toIdent = index => chr(97 + index)

/** used to skip unquoted object keys */
const noIdent = /[^\w$]/g

/** used to skip whitespace */
const noWs = /\S/g

/** used to skip numbers (bin, oct, hex, exp) */
const noNum = /[^a-fox\d]/gi

/** preserved keywords in expressions (operators and values only) */
const keywords = 'false,in,instanceof,new,null,true,typeof,void'.split(',')

/* -----------------------------------------------------------------------------
 * expression parser/evaluator singleton
 */
export default Base.create.call({

  brackets: []
 
, constructor () {
    /** parser index */
    this.index = 0

    /** input source code */
    this.input = ''

    /** input delimiter */
    this.suffix = ''

    /** pending index used for buffering, copying parts from input to output */
    this.anchor = 0

    /** used to keep track of brackets/braces/parentheses */
    this.brackets.length = 0

    /** indicates whether the current identifier could be an object key */
    this.maybeKey = false

    /** array of key-chains being collected (result) */
    this.paths = []

    /** mangled output source (result) */
    this.output = ''
  }

, parse (input, delimiters) {
    var [prefix, suffix] = delimiters || ['', '']
      , begin = input.indexOf(prefix)
      , expression
    
    if (begin < 0) return
    
    this.index = begin + prefix.length
    this.input = input
    this.suffix = suffix

    this.dataState()

    expression =
    { paths: this.paths
    , source: trim(this.output)
    , begin: begin
    , end: this.index + suffix.length
    }

    this.constructor() // reset

    return expression
  }

  /** @static */
, evaluate (expression) {
    var argc = expression.paths.length
      , signature = Array(argc)

    while (argc--) {
      signature[argc] = toIdent(argc)
    }

    signature.push('return ' + expression.source)

    return Function.apply(null, signature)
  }

  /* ---------------------------------------------------------------------------
   * parser utilities
   */
, buffer () {
    this.anchor = this.index
  }

, flush () {
    if (this.anchor < this.index) {
      this.output += this.input.substring(this.anchor, this.index)
      this.anchor = this.index
    }
  }

, seek (regex, skip) {
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

, seekUesc (chr, skip) {
    var index

    if (skip) this.index += 1

    do {
      index = this.input.indexOf(chr, this.index)
      this.index = index+1
    }
    while (this.input.charAt(index-1) === '\\')
    // input.indexOf(-2) === '\\' always yields false
  }

, hasReachedSuffix () {
    var suffix = this.suffix

    return (
      suffix &&
      this.brackets.length == 0 &&
      this.input.substr(this.index, suffix.length) === suffix
    )
  }

, addPath (path) {
    var index = findIndex(this.paths, other => eqArray(other, path))
    if (index < 0) index = this.paths.push(path) - 1
    this.output += toIdent(index)
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
, dataState () {
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
        this.seekUesc(chr, true)
        if (!this.index) if (DEBUG) throw new Error('unterminated string literal')
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
      else if (DEBUG) {
        // not on prototype for dead-code removal
        debugState.call(this, chr)
      }

      // ensure increment
      if (this.index === index) this.index += 1
    }

    this.flush()
  }

, slashState () {
    var chr = this.input.charAt(++this.index)

    if (chr === '/' || chr === '*') {
      if (DEBUG) throw new Error('comments not allowed')
    }
    else if (chr === '=') {
      if (DEBUG) throw new Error('assignments not allowed')  
    }
  }

, identState () {
    const ident = this.seek(matchIdent)

    if (this.maybeKey && this.brackets[0] === '{') {
      this.index += ident.length
      this.flush()
      
      if (this.seek(noWs) !== ':') {
        this.output += ':'
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

, pathState (path) {
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

, dotState (path) {
    var chr = this.seek(noWs, true)
      , ident

    if (passIdent.test(chr)) {
      ident = this.seek(matchIdent)
      this.index += ident.length
      if (path) path.push(ident)
    }
    else if (!isFinite(chr)) { // never whitespace
      if (DEBUG) throw new Error('missing name after dot operator')
    }
  }

  /**
   * returns true if the enclosed expression is dynamic
   * i.e. cannot be statically resolved
   */
, bracketOpenState (path) {
    var chr = this.seek(noWs, true)
      , begin, ident

    if (chr === '"' || chr === "'") {
      begin = this.index
      this.seekUesc(chr, true)

      if (!this.index) if (DEBUG) throw new Error('unterminated string literal')
      
      ident = this.input.substring(begin+1, this.index-1) // trim quotes
      path.push(ident) 
      
      return this.bracketCloseState(path)
    }
    else if (isFinite(chr)) { // never whitespace
      begin = this.index
      this.seek(noNum, true)
      
      ident = this.input.substring(begin, this.index)
      path.push(+ident) // coarse number
      
      return this.bracketCloseState(path)
    }
    else if (!chr) {
      if (DEBUG) throw new Error('expected expression, got end of script')
    }
    // do not support keyword values as accessors (true, false, null, etc.)

    return true
  }

  /**
   * returns true if the enclosed expression is dynamic
   * i.e. cannot be statically resolved
   */
, bracketCloseState (path) {
    var chr = this.seek(noWs)

    if (!chr) {
      if (DEBUG) throw new Error('expected expression, got end of script')
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
})

/** used match the first character of a possibly forbidden operator */
const beginOperator = '=+-*/|&^<!>'

/** used to match javascript operators (debug) */
const matchOperator = /[\+\-]{2}|[\+\-\*\/\^\&\|<%>]=|=>|={1,3}|!==?|<<=?|>>>?=?/g

/** used to look up forbidden operators */
const assignOperators = ['=', '++', '--', '+=', '-=', '*=', '/=', '|=', '&=', '^=', '<<=', '>>=', '>>>=']

function debugState (chr) {
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
