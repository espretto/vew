
import Base from './util/base'
import { Array } from './util/global'
import { trim, chr } from '.util/string'
import { indexOf, findIndex, eqArray } from './util/array'

/** used skip numbers (any format except e.g. `.5`) */
const passNum = /^\d/

/** used to match the first character of a javascript identifier or keyword */
const passIdent = /[a-zA-Z\$_]/

/** used to skip whitespace */
const noWs = /\S/g

/** used to skip numbers (bin, oct, hex, exp) */
const noNum = /[^a-fox\d]/gi

/** used to skip object keys */
const noIdent = /[^\w\$]/g

/** used to match javascript identifiers and keywords */
const matchIdent = /[a-zA-Z\$_][\w\$]*/g

/** preserved keywords in expressions (operators and values only) */
const keywords = 'false,in,instanceof,new,null,true,typeof,void'.split(',')

function toIdent (i) {
  if (i > 25) {
    if (DEBUG) throw new Error('surpassed max no. arguments')
  }
  return chr(97 + i)
}

/* -----------------------------------------------------------------------------
 * expression parser/evaluator singleton
 */
export default Base.create.call({
 
  constructor () {
    /** parser index */
    this.index = 0

    /** input source code */
    this.input = ''

    /** input delimiter */
    this.suffix = ''

    /** pending index used for buffering, copying parts from input to output */
    this.anchor = ''

    /** used to keep track of brackets/braces/parentheses */
    this.brackets = []

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

, seek (regex, offset) {
    if (offset) this.index += offset
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

, seekUnescaped (chr, offset) {
    if (offset) this.index += offset

    do {
      var index = this.input.indexOf(chr, this.index)
      this.index = index+1
    }
    while (this.input.charAt(index-1) === '\\')
  }

, hasReachedSuffix () {
    var suffix = this.suffix

    return (
      suffix &&
      this.brackets.length == 0 &&
      this.input.substr(this.index, suffix.length) === suffix
    )
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
      else if (passNum.test(chr)) {
        this.seek(noNum, 1)
      }
      else if (chr === '/') {
        this.slashState()
      }
      else if (chr === '"' || chr === "'") {
        this.seekUnescaped(chr, 1)
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
    else {
      this.seekUnescaped('/')
      if (!this.index) if (DEBUG) throw new Error('unterminated regular expression')
    }
  }

, identState () {
    if (this.maybeKey && this.brackets[0] === '{') {
      this.seek(noIdent, 1)
    }
    else {
      var ident = this.seek(matchIdent)

      if (indexOf(keywords, ident) < 0) {
        this.flush()
        this.index += ident.length
        this.pathState( [ident] )
      }
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

    // add expression dependency - the path - to argument list
    var argIndex = findIndex(this.paths, path_ => eqArray(path, path_))
    if (argIndex < 0) argIndex = this.paths.push(path)-1

    this.output += toIdent(argIndex)
    this.flush()
  }

, dotState (path) {
    var chr = this.seek(noWs, 1)
      , ident

    if (passIdent.test(chr)) {
      ident = this.seek(matchIdent)
      this.index += ident.length
      if (path) path.push(ident)
    }
    else if (!passNum.test(chr)) {
      if (DEBUG) throw new Error('missing name after dot operator')
    }
  }

  /**
   * returns true if the enclosed expression is dynamic
   * i.e. cannot be statically resolved
   */
, bracketOpenState (path) {
    var chr = this.seek(noWs, 1)
      , begin, ident

    if (chr === '"' || chr === "'") {
      begin = this.index
      this.seekUnescaped(chr, 1)

      if (!this.index) if (DEBUG) throw new Error('unterminated string literal')
      
      ident = this.input.substring(begin+1, this.index-1) // trim quotes
      path.push(ident) 
      
      return this.bracketCloseState(path)
    }
    else if (passNum.test(chr)) {
      begin = this.index
      this.seek(noNum, 1)
      
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
    }
    else {
      path.pop()
      return true
    }
  }
})

/** used to match javascript operators (debug) */
const matchOperator = /[\+\-]{2}|[\+\-\*\/\^\&\|<%>]=|=>|={1,3}|!==?|<<=?|>>>?=?/g

/** used match the first character of a possibly forbidden operator */
const beginOperator = '=+-*/|&^<!>'

function debugState (chr) {
  if (chr === ';') {
    throw new Error('statements are not allowed')
  }
  else if (beginOperator.indexOf(chr) > -1) {
    var match, operator

    matchOperator.lastIndex = this.index
    match = matchOperator.exec(this.input)

    // early exit if not matched at the current position
    if (!match || match.index !== this.index) return

    operator = match[0]
    switch (operator) {
      case '=>':
        throw new Error('arrow operator not supported')
      case '=':
      case '++':
      case '--':
      case '+=':
      case '-=':
      case '*=':
      case '/=':
      case '|=':
      case '&=':
      case '^=':
      case '<<=':
      case '>>=':
      case '>>>=':
        throw new Error('assignments are not allowed')
      case '<=':
      case '>=':
      case '!=':
      case '!==':
        this.index += operator.length
    }
  }
}
