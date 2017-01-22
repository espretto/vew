
import chai from 'chai'
import { expect } from 'chai'

import {
  chr
, trim
} from './string'

describe('String Utils', () => {

  describe('#chr', () => {
    it('should exist', () => {
      expect(chr).to.be.a('function')
    })
    it('should return proper characters', () => {
      expect(chr(0)).to.equal('\u0000')
      expect(chr(32)).to.equal(' ')
      expect(chr(33)).to.equal('!')
    })
  })

  describe('#trim', () => {
    it('should exist', () => {
      expect(trim).to.be.a('function')
    })
    it('should trim whitespaces', () => {
      expect(trim(' x ')).to.equal('x')
      expect(trim("\tx\n")).to.equal('x')
    })
  })
})
