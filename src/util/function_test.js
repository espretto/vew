
import { expect } from 'chai'
import sinon from 'sinon'

import {
  thisify
, uncurry
} from './function'

describe('Function Utils', () => {

  let spy
  beforeEach(() => spy = sinon.spy() )
  
  describe('#thisify', () => {
    it('should exist', () => {
      expect(thisify).to.be.a('function')
    })
    it('should bind given context', () => {
      thisify(spy, '1', 0)()
      thisify(spy, '2', 1)()
      thisify(spy, '3', 2)()
      thisify(spy, '4', 3)()
      expect(spy.thisValues[0]).to.equal('1')
      expect(spy.thisValues[1]).to.equal('2')
      expect(spy.thisValues[2]).to.equal('3')
      expect(spy.thisValues[3]).to.equal('4')
    })
    it('should pass through additional arguments', () => {
      thisify(spy, null, 0)()
      thisify(spy, null, 1)(1)
      thisify(spy, null, 2)(1, 2)
      thisify(spy, null, 3)(1, 2, 3)
      expect(spy.args[0]).to.deep.equal([])
      expect(spy.args[1]).to.deep.equal([1])
      expect(spy.args[2]).to.deep.equal([1, 2])
      expect(spy.args[3]).to.deep.equal([1, 2, 3])
    })
  })

  describe('#uncurry', () => {
    it('should exist', () => {
      expect(uncurry).to.be.a('function')
    })
    it('should bind given context', () => {
      uncurry(spy, 0)('1')
      uncurry(spy, 1)('2')
      uncurry(spy, 2)('3')
      uncurry(spy, 3)('4')
      expect(spy.thisValues[0]).to.equal('1')
      expect(spy.thisValues[1]).to.equal('2')
      expect(spy.thisValues[2]).to.equal('3')
      expect(spy.thisValues[3]).to.equal('4')
    })
    it('should pass through additional arguments', () => {
      uncurry(spy, 0)(null)
      uncurry(spy, 1)(null, 1)
      uncurry(spy, 2)(null, 1, 2)
      uncurry(spy, 3)(null, 1, 2, 3)
      expect(spy.args[0]).to.deep.equal([])
      expect(spy.args[1]).to.deep.equal([1])
      expect(spy.args[2]).to.deep.equal([1, 2])
      expect(spy.args[3]).to.deep.equal([1, 2, 3])
    })
  })
})
