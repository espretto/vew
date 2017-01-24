
import { expect } from 'chai'

import {
  has
, toPath
} from './path'

describe('Path Utils', () => {

  describe('#has', () => {
    it('should exist', () => {
      expect(has).to.be.a('function')
    })
    it('should detect object keys', () => {
      expect(has({key: undefined}, 'key')).to.be.true
      expect(has({key: false}, 'key')).to.be.true
    })
    it('should reject non present object keys', () => {
      expect(has({}, 'key')).to.be.false
    })
    it('should detect array indexes', () => {
      expect(has([undefined, undefined], 1)).to.be.true
    })
    it('should reject non present array indexes', () => {
      expect(has([undefined, undefined], 2)).to.be.false
    })
  })

  describe('#toPath', () => {
    it('should exist', () => {
      expect(toPath).to.be.a('function')
    })
    it('should resolve single string', () => {
      expect(toPath('x')).to.deep.equal(['x'])
    })
    it('should resolve dot syntax', () => {
      expect(toPath('x.y')).to.deep.equal(['x', 'y'])
      expect(toPath('x.y.z')).to.deep.equal(['x', 'y', 'z'])
    })
    it('should resolve array syntax', () => {
      expect(toPath('[1]')).to.deep.equal([1])
    })
    it('should resolve nested array syntax', () => {
      expect(toPath('[1][2]')).to.deep.equal([1, 2])
      expect(toPath('[1][2][3]')).to.deep.equal([1, 2, 3])
    })
    it('should resolve mixed nested starting w/ dot syntax', () => {
      expect(toPath('x[1]')).to.deep.equal(['x', 1])
      expect(toPath('x[1].y')).to.deep.equal(['x', 1, 'y'])
      expect(toPath('x[1].y[2]')).to.deep.equal(['x', 1, 'y', 2])
      expect(toPath('x[1].y[2].z')).to.deep.equal(['x', 1, 'y', 2, 'z'])
      expect(toPath('x[1].y[2].z[3]')).to.deep.equal(['x', 1, 'y', 2, 'z', 3])
    })
    it('should resolve mixed nested starting w/ array syntax', () => {
      expect(toPath('[1].x')).to.deep.equal([1, 'x'])
      expect(toPath('[1].x[2]')).to.deep.equal([1, 'x', 2])
      expect(toPath('[1].x[2].y')).to.deep.equal([1, 'x', 2, 'y'])
      expect(toPath('[1].x[2].y[3]')).to.deep.equal([1, 'x', 2, 'y', 3])
      expect(toPath('[1].x[2].y[3].z')).to.deep.equal([1, 'x', 2, 'y', 3, 'z'])
    })
  })
})
