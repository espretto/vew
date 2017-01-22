
import chai from 'chai'
import { expect } from 'chai'

import {
  isObject
, isString
, isUndefined
, isFunction
, idNative
, isArray
, isDate
, isPlainObject
} from './type'

// FIXME: find better naming
// FIXME: add current result to error message
function chaiHelperFactory (expected) {
  return function (any) {
    this.assert(
      this._obj(any) === expected,
      'expected #{act} to result in #{exp}',
      'expected #{act} to not result in #{exp}',
      expected, // #{exp}
      any       // #{act}
    )
  }
}

chai.use(function (chai, utils) {
  chai.Assertion.addMethod('accept', chaiHelperFactory(true))
  chai.Assertion.addMethod('reject', chaiHelperFactory(false))
  chai.Assertion.addMethod('whatever', chaiHelperFactory(undefined))
})

describe('Type Utils', () => {

  describe('#isObject', () => {
    it('should exist', () => {
      expect(isObject).to.be.a('function')
    })
    it('should accept objects and such', () => {
      expect(isObject).to.accept({})
      expect(isObject).to.accept([])
      expect(isObject).to.accept(() => {})
      expect(isObject).to.accept(function () {})
      expect(isObject).to.accept(new Number(42))
      expect(isObject).to.accept(new String('string'))
    })
    it('should whatever string and number literals', () => {
      expect(isObject).to.whatever(42)
      expect(isObject).to.whatever('string')
    })
    it('should reject `null` and undefined', () => {
      expect(isObject).to.reject(undefined)
      expect(isObject).to.reject(null)
    })
  })

  describe('#isString', () => {
    it('should exist', () => {
      expect(isString).to.be.a('function')
    })
    it('should accept string literals', () => {
      expect(isString).to.accept('string')
    })
    it('should reject string objects', () => {
      expect(isString).to.reject(new String('string'))
    })
    it('should reject the rest', () => {
      expect(isString).to.reject(null)
      expect(isString).to.reject(undefined)
      expect(isString).to.reject(42)
      expect(isString).to.reject({})
      expect(isString).to.reject([])
      expect(isString).to.reject(() => {})
    })
  })

  describe('#isUndefined', () => {
    it('should exist', () => {
      expect(isUndefined).to.be.a('function')
    })
    it('should accept `undefined`', () => {
      expect(isUndefined).to.accept(undefined)
    })
    it('should reject the rest', () => {
      expect(isUndefined).to.reject(null)
      expect(isUndefined).to.reject(42)
      expect(isUndefined).to.reject('string')
      expect(isUndefined).to.reject({})
      expect(isUndefined).to.reject([])
      expect(isUndefined).to.reject(() => {})
    })
  })

  describe('#isFunction', () => {
    it('should exist', () => {
      expect(isFunction).to.be.a('function')
    })
    it('should accept functions', () => {
      expect(isFunction).to.accept(() => {})
      expect(isFunction).to.accept(function () {})
    })
    it('should reject the rest', () => {
      expect(isFunction).to.reject(undefined)
      expect(isFunction).to.reject(null)
      expect(isFunction).to.reject(42)
      expect(isFunction).to.reject('string')
      expect(isFunction).to.reject({})
      expect(isFunction).to.reject([])
    })
  })

  describe('#idNative', () => {
    it('should exist', () => {
      expect(idNative).to.be.a('function')
    })
    it('should accept arrow functions', () => {
      expect(idNative(() => {})).to.be.a('function')
    })
    it('should whatever the rest', () => {
      expect(idNative).to.whatever(function () {})
      expect(idNative).to.whatever(undefined)
      expect(idNative).to.whatever(null)
      expect(idNative).to.whatever(42)
      expect(idNative).to.whatever('string')
      expect(idNative).to.whatever({})
      expect(idNative).to.whatever([])
    })
  })

  describe('#isArray', () => {
    it('should exist', () => {
      expect(isArray).to.be.a('function')
    })
    it('should accept arrays', () => {
      expect(isArray).to.accept([])
      expect(isArray).to.accept(new Array())
    })
    it('should reject the rest', () => {
      expect(isArray).to.reject({})
      expect(isArray).to.reject(undefined)
      expect(isArray).to.reject(null)
      expect(isArray).to.reject(42)
      expect(isArray).to.reject('string')
      expect(isArray).to.reject(() => {})
      expect(isArray).to.reject(function () {})
    })
  })

  describe('#isDate', () => {
    it('should exist', () => {
      expect(isDate).to.be.a('function')
    })
    it('should accept date objects', () => {
      expect(isDate).to.accept(new Date())
    })
    it('should whatever string and number literals', () => {
      expect(isDate).to.whatever(42)
      expect(isDate).to.whatever('string')
    })
    it('should reject the rest', () => {
      expect(isDate).to.reject({})
      expect(isDate).to.reject([])
      expect(isDate).to.reject(undefined)
      expect(isDate).to.reject(null)
      expect(isDate).to.reject(function () {})
    })
  })

  describe('#isPlainObject', () => {
    it('should exist', () => {
      expect(isPlainObject).to.be.a('function')
    })
    it('should accept plain objects', () => {
      expect(isPlainObject).to.accept({})
    })
    it('should whatever string and number literals', () => {
      expect(isPlainObject).to.whatever(42)
      expect(isPlainObject).to.whatever('string')
    })
    it('should reject the rest', () => {
      expect(isPlainObject).to.reject([])
      expect(isPlainObject).to.reject(undefined)
      expect(isPlainObject).to.reject(null)
      expect(isPlainObject).to.reject(function () {})
    })
  })
})
