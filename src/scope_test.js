
import { expect } from 'chai'
import sinon from 'sinon'

import Scope from './scope'


describe('Scope', function() {

  var scope
  beforeEach(() => scope = Scope.create())

  it('object should instantiate', function() {
    expect(scope).to.be.an('object')
  })

  describe('#resolve', () => {
    it('should return merged value', () => {
      scope.merge({test: 'works for me'})
      expect(scope.resolve('test')).to.equal('works for me')
    })
    it('should return merged nested value', () => {
      scope.merge({nested: {test: 'works for me'}})
      expect(scope.resolve('nested.test')).to.equal('works for me')
    })
    it('should return merged array', () => {
      scope.merge(['works for me', 'second'])
      expect(scope.resolve('[0]')).to.equal('works for me')
      expect(scope.resolve('[1]')).to.equal('second')
    })
    it('should return merged nested array', () => {
      scope.merge({nested: ['works for me', 'second']})
      expect(scope.resolve('nested[0]')).to.equal('works for me')
      expect(scope.resolve('nested[1]')).to.equal('second')
    })
    it('should return merged nested value in array', () => {
      scope.merge([{first: 'works for me'}, {second: 'second'}])
      expect(scope.resolve('[0].first')).to.equal('works for me')
      expect(scope.resolve('[1].second')).to.equal('second')
    })
    it('should return merged nested turtles', () => {
      scope.merge([{first: [,,{x: {y: {z: [,'works for me']}}}]}])
      expect(scope.resolve('[0].first[2].x.y.z[1]')).to.equal('works for me')
    })
  })

  describe('#update', () => {

    var callback
    beforeEach(() => callback = sinon.spy())

    it('should execute subscribed callback', () => {
      scope.subscribe('test', callback)
      scope.merge({test: 'works for me'})
      scope.update()
      expect(callback.called).to.be.true
    })
    it('should not execute unsubscribed callback', () => {
      scope.subscribe('test', callback)
      scope.unsubscribe('test', callback)
      scope.merge({test: 'works for me'})
      scope.update()
      expect(callback.called).to.equal.false
    })
  })

  describe('#replace', () => {
    it('is not yet implemented', () => {
      expect(scope.replace.bind(scope)).to.throw(/not yet implemented/)
    })
  })
})
