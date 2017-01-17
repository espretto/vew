
import expect from 'expect.js'

import Scope from './scope'


describe('Scope', function() {

  var scope
  beforeEach(() => scope = Scope.new())

  it('object should instantiate', function() {
    expect(scope).to.be.an('object')
  })

  describe('#resolve', () => {
    it('should return merged value', () => {
      scope.merge({test: 'works for me'})
      expect(scope.resolve('test')).to.be('works for me')
    })
    it('should return merged nested value', () => {
      scope.merge({nested: {test: 'works for me'}})
      expect(scope.resolve('nested.test')).to.be('works for me')
    })
    it('should return merged array', () => {
      scope.merge(['works for me', 'second'])
      expect(scope.resolve('[0]')).to.be('works for me')
      expect(scope.resolve('[1]')).to.be('second')
    })
    it('should return merged nested array', () => {
      scope.merge({nested: ['works for me', 'second']})
      expect(scope.resolve('nested[0]')).to.be('works for me')
      expect(scope.resolve('nested[1]')).to.be('second')
    })
    it('should return merged nested value in array', () => {
      scope.merge([{first: 'works for me'}, {second: 'second'}])
      expect(scope.resolve('[0].first')).to.be('works for me')
      expect(scope.resolve('[1].second')).to.be('second')
    })
    it('should return merged nested turtles', () => {
      scope.merge([{first: [,,{x: {y: {z: [,'works for me']}}}]}])
      expect(scope.resolve('[0].first[2].x.y.z[1]')).to.be('works for me')
    })
  })

  describe('#update', () => {
    it('should execute subscribed callback', () => {
      var called = false;
      scope.subscribe('test', () => {
        called = true
      })
      scope.merge({test: 'works for me'})
      scope.update()
      expect(called).to.be(true)
    })
  })

  describe('#replace', () => {
    it('is not yet implemented', () => {
      expect(scope.replace.bind(scope)).to.throwException((error) => {
        expect(error.message).to.be('not yet implemented')
      })
    })
  })
})
