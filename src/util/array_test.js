
import { expect } from 'chai'
import sinon from 'sinon'

import {
  last
, indexOf
, lastIndexOf
, includes
, remove
, removeAt
, insertAt
, some
, every
, map
, filter
, reduce
, reduceRight
, fold
, foldRight
, find
, findIndex
, forBoth
, append
, eqArray
, range
} from './array'


describe('Array Utils', function() {

  // FIXME: global vars are evil
  beforeEach(() => {
    (1, eval)('this').DEBUG = undefined
  })

  let array
  beforeEach(() => array = [1, 2, 3, 4, 5])

  describe('#last', () => {
    it('should exist', () => {
      expect(last).to.be.a('function')
    })
    it('should return last item of array', () => {
      expect(last([1])).to.equal(1)
      expect(last([,2])).to.equal(2)
      expect(last([,,3])).to.equal(3)
    })
    it('should return `undefined` if array empty', () => {
      expect(last([])).to.be.undefined
    })
  })

  describe('#indexOf', () => {
    it('should exist', () => {
      expect(indexOf).to.be.a('function')
    })
    it('should return index of found item', () => {
      expect(indexOf(array, 2)).to.equal(1)
      expect(indexOf(array, 4)).to.equal(3)
    })
    it('should return `-1` on unknown item', () => {
      expect(indexOf(array, 42)).to.equal(-1)
    })
    it('should respect offset', () => {
      expect(indexOf(array, 2, 2)).to.equal(-1)
    })
  })

  describe('#lastIndexOf', () => {
    it('should exist', () => {
      expect(lastIndexOf).to.be.a('function')
    })
    it('should return index of found item', () => {
      expect(lastIndexOf(array, 2)).to.equal(1)
      expect(lastIndexOf(array, 4)).to.equal(3)
    })
    it('should return `-1` on unknown item', () => {
      expect(lastIndexOf(array, 42)).to.equal(-1)
    })
    it('should respect offset', () => {
      expect(lastIndexOf(array, 4, 2)).to.equal(-1)
    })
  })

  describe('#includes', () => {
    it('should exist', () => {
      expect(includes).to.be.a('function')
    })
    it('should return `true` on found item', () => {
      expect(includes(array, 3)).to.be.true
    })
    it('should return `false` on unknown item', () => {
      expect(includes(array, 42)).to.be.false
    })
  })

  describe('#removeAt', () => {
    it('should exist', () => {
      expect(removeAt).to.be.a('function')
    })
    it('should remove items', () => {
      removeAt(array, 1, 2)
      expect(array).to.deep.equal([1, 4, 5])
    })
    it('should default to remove one item', () => {
      removeAt(array, 1)
      expect(array).to.deep.equal([1, 3, 4, 5])
    })
  })

  describe('#remove', () => {
    it('should exist', () => {
      expect(remove).to.be.a('function')
    })
    it('should remove item', () => {
      remove(array, 2)
      expect(array).to.deep.equal([1, 3, 4, 5])
    })
    it('should return index of removed item', () => {
      expect(remove(array, 2)).to.equal(1)
    })
    it('should not alter array on unknown item', () => {
      remove(array, 42)
      expect(array).to.deep.equal([1, 2, 3, 4, 5])
    })
  })

  describe('#insertAt', () => {
    it('should exist', () => {
      expect(insertAt).to.be.a('function')
    })
    it('should insert at the beginning', () => {
      insertAt(array, 0, 42)
      expect(array).to.deep.equal([42, 1, 2, 3, 4, 5])
    })
    it('should insert in the middle', () => {
      insertAt(array, 2, 42)
      expect(array).to.deep.equal([1, 2, 42, 3, 4, 5])
    })
    it('should insert at the end', () => {
      insertAt(array, 5, 42)
      expect(array).to.deep.equal([1, 2, 3, 4, 5, 42])
    })
    it('should insert beyond the end', () => {
      insertAt(array, 7, 42)
      expect(array).to.deep.equal([1, 2, 3, 4, 5, , , 42])
    })
  })

  describe('#some', () => {
    it('should exist', () => {
      expect(some).to.be.a('function')
    })
    it('should return `true`', () => {
      expect(some(array, item => { return item === 3 })).to.be.true
    })
    it('should return `false`', () => {
      expect(some(array, () => { return false })).to.be.false
    })
    it('should call callbacks for each item', () => {
      let spy = sinon.spy()
      some(array, spy)
      expect(spy.callCount).to.equal(5)
    })
    it('should call callbacks w/ arguments item and index', () => {
      let spy = sinon.spy()
      some(array, spy)
      array.forEach((item, index) => {
        expect(spy.args[index]).to.deep.equal([array[index], index])
      })
    })
  })

  describe('#every', () => {
    it('should exist', () => {
      expect(every).to.be.a('function')
    })
    it('should return `true`', () => {
      expect(every(array, () => { return true })).to.be.true
    })
    it('should return `false`', () => {
      expect(every(array, item => { return item === 3 })).to.be.false
    })
  })

  describe('#map', () => {
    it('should exist', () => {
      expect(map).to.be.a('function')
    })
    it('should return mapped array', () => {
      let result = map(array, (item, index) => { return 'x'+item+index })
      expect(result).to.deep.equal(['x10', 'x21', 'x32', 'x43', 'x54'])
    })
  })

  describe('#filter', () => {
    it('should exist', () => {
      expect(filter).to.be.a('function')
    })
    it('should return filtered array', () => {
      let result = filter(array, (item, index) => { return item === 3 || index === 4 })
      expect(result).to.deep.equal([3, 5])
    })
  })

  describe('#reduce', () => {
    it('should exist', () => {
      expect(reduce).to.be.a('function')
    })
    it('should not depend on global var `DEBUG`', () => {
      // remove this test once issue is fixed
      // also adjust other #reduce tests
      delete (1, eval)('this').DEBUG
      expect(() => { reduce(array, () => {} )}).to.not.throw(ReferenceError)
    })
    it('should throw error on short array in debug mode', () => {
      (1, eval)('this').DEBUG = true
      expect(() => { reduce([1], () => {} )}).to.throw(/reduce of empty array with no initial value/)
    })
    it('should be able to calculate a sum of items', () => {
      let sum = reduce(array, (current, item) => {
        return current + item
      })
      expect(sum).to.equal(15)
    })
    it('should execute callbacks w/ arguments item and index', () => {
      let spy = sinon.spy(() => { return 'x' })
      reduce(array, spy)
      ;[
        [1, 2, 1],
        ['x', 3, 2],
        ['x', 4, 3],
        ['x', 5, 4]
      ].forEach((expected, index) => {
        expect(spy.args[index]).to.deep.equal(expected)
      })
    })
  })

  describe('#reduceRight', () => {
    it('should exist', () => {
      expect(reduceRight).to.be.a('function')
    })
    it('should be able to calculate a sum of items', () => {
      let sum = reduceRight(array, (current, item) => {
        return current + item
      })
      expect(sum).to.equal(15)
    })
    it('should execute callbacks w/ arguments item and index in reverse order', () => {
      let spy = sinon.spy(() => { return 'x' })
      reduceRight(array, spy)
      ;[
        [4, 5, 3],
        [3, 'x', 2],
        [2, 'x', 1],
        [1, 'x', 0],
      ].forEach((expected, index) => {
        expect(spy.args[index]).to.deep.equal(expected)
      })
    })
  })

  describe('#fold', () => {
    it('should exist', () => {
      expect(fold).to.be.a('function')
    })
    it('should be able to calculate a sum of items', () => {
      let sum = fold(array, 0, (current, item) => {
        return current + item
      })
      expect(sum).to.equal(15)
    })
    it('should respect initial value', () => {
      let sum = fold(array, 10, (current, item) => {
        return current + item
      })
      expect(sum).to.equal(25)
    })
    it('should execute callbacks w/ arguments item and index', () => {
      let spy = sinon.spy(() => { return 'x' })
      fold(array, 42, spy)
      ;[
        [42, 1, 0],
        ['x', 2, 1],
        ['x', 3, 2],
        ['x', 4, 3],
        ['x', 5, 4]
      ].forEach((expected, index) => {
        expect(spy.args[index]).to.deep.equal(expected)
      })
    })
  })

  describe('#foldRight', () => {
    beforeEach(() => { (1, eval)('this').DEBUG = undefined })
    it('should exist', () => {
      expect(foldRight).to.be.a('function')
    })
    it('should not depend on global var `DEBUG`', () => {
      // remove this test once issue is fixed
      // also adjust other #reduce tests
      delete (1, eval)('this').DEBUG
      expect(() => { reduce(array, () => {} )}).to.not.throw(ReferenceError)
    })
    it('should be able to calculate a sum of items', () => {
      let sum = foldRight(array, 0, (current, item) => {
        return current + item
      })
      expect(sum).to.equal(15)
    })
    it('should respect initial value', () => {
      let sum = foldRight(array, 10, (current, item) => {
        return current + item
      })
      expect(sum).to.equal(25)
    })
    it('should execute callbacks w/ arguments item and index in reverse order', () => {
      let spy = sinon.spy(() => { return 'x' })
      foldRight(array, 42, spy)
      ;[
        [5, 42, 4],
        [4, 'x', 3],
        [3, 'x', 2],
        [2, 'x', 1],
        [1, 'x', 0],
      ].forEach((expected, index) => {
        expect(spy.args[index]).to.deep.equal(expected)
      })
    })
  })

  describe('#findIndex', () => {
    it('should exist', () => {
      expect(findIndex).to.be.a('function')
    })
    it('should return index of first matched item', () => {
      expect(findIndex(array, item => { return item === 3 || item === 5})).to.equal(2)
    })
    it('should return `-1` if not matched', () => {
      expect(findIndex(array, item => { return false })).to.equal(-1)
    })
    it('should respect offset', () => {
      expect(findIndex(array, (item, index) => { return index === 2 }, 2)).to.equal(2)
      expect(findIndex(array, (item, index) => { return index === 2 }, 3)).to.equal(-1)
    })
  })

  describe('#find', () => {
    it('should exist', () => {
      expect(find).to.be.a('function')
    })
    it('should return first matched item', () => {
      expect(find(array, item => { return item === 3 || item === 5})).to.equal(3)
    })
    it('should return `undefined` if not matched', () => {
      expect(find(array, item => { return false })).to.be.undefined
    })
    it('should respect offset', () => {
      expect(find(array, (item, index) => { return index === 2 }, 2)).to.equal(3)
      expect(find(array, (item, index) => { return index === 2 }, 3)).to.be.undefined
    })
  })

  describe('#forBoth', () => {
    it('should exist', () => {
      expect(forBoth).to.be.a('function')
    })
    it('should not depend on global var `DEBUG`', () => {
      // remove this test once issue is fixed
      // also adjust other #reduce tests
      delete (1, eval)('this').DEBUG
      expect(() => { forBoth(array, array) }).to.not.throw(ReferenceError)
    })
    it('should execute callbacks w/ arguments', () => {
      let brray = array.map(item => { return ''+item })
      let spy = sinon.spy()
      forBoth(array, brray, spy)
      ;[
        [1, '1', 0],
        [2, '2', 1],
        [3, '3', 2],
        [4, '4', 3],
        [5, '5', 4],
      ].forEach((expected, index) => {
        expect(spy.args[index]).to.deep.equal(expected)
      })
    })
    it('should stop executing after false', () => {
      let spy = sinon.spy(item => { return item !== 3 })
      forBoth(array, array, spy)
      ;[
        [1, 1, 0],
        [2, 2, 1],
        [3, 3, 2],
      ].forEach((expected, index) => {
        expect(spy.args[index]).to.deep.equal(expected)
      })
    })
  })

  describe('#append', () => {
    it('should exist', () => {
      expect(append).to.be.a('function')
    })
    it('should return result array', () => {
      expect(append([1, 2], [3, 4])).to.deep.equal([1, 2, 3, 4])
    })
    it('should mutate first argument', () => {
      append(array, [6, 7])
      expect(array).to.deep.equal([1, 2, 3, 4, 5, 6, 7])
    })
    it('should tolerate empty arrays', () => {
      expect(append([], [3, 4])).to.deep.equal([3, 4])
      expect(append([1, 2], [])).to.deep.equal([1, 2])
    })
  })

  describe('#eqArray', () => {
    it('should exist', () => {
      expect(eqArray).to.be.a('function')
    })
    it('should positively compare equal arrays', () => {
      expect(eqArray([1, 2], [1, 2])).to.be.true
    })
    it('should negatively compare unequal arrays', () => {
      expect(eqArray([1, 2], [1, 3])).to.be.false
      expect(eqArray([1, 2], [1, 2, 3])).to.be.false
    })
  })

  describe('#range', () => {
    it('should exist', () => {
      expect(range).to.be.a('function')
    })
    it('should work w/ given `end`', () => {
      expect(range(2)).to.deep.equal([0, 1])
      expect(range(4)).to.deep.equal([0, 1, 2, 3])
    })
    it('should return empty array w/ given negative `end`', () => {
      expect(range(-2)).to.deep.equal([])
    })
    it('should work w/ given `begin` less than `end`', () => {
      expect(range(0, 3)).to.deep.equal([0, 1, 2])
      expect(range(3, 5)).to.deep.equal([3, 4])
      expect(range(-1, 2)).to.deep.equal([-1, 0, 1])
      expect(range(-3, -1)).to.deep.equal([-3, -2])
    })
    it('should return empty array w/ given `begin` greater than `end`', () => {
      expect(range(2, 1)).to.deep.equal([])
      expect(range(1, -2)).to.deep.equal([])
    })
    it('should work w/ given `begin`, `step` and `end`', () => {
      expect(range(0, 1, 3)).to.deep.equal([0, 1, 2])
      expect(range(3, 2, 7)).to.deep.equal([3, 5])
    })
  })
})
