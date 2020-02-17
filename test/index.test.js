'require strict'

/* eslint-env mocha */
/* eslint-disable import/no-unresolved, no-unused-expressions */

describe('index.js', () => {
  const sinon = require('sinon')
  const { expect } = require('chai')
  // const cleanrequire = require('@everymundo/cleanrequire')
  // const loadLib = () => cleanrequire('../index.js')

  // const noop = () => { }

  // eslint-disable-next-line one-var-declaration-per-line
  let box

  // const logr = require('@everymundo/simple-logr')
  beforeEach(() => {
    box = sinon.createSandbox()
    // ['log', 'info', /* 'debug',  */'error']
    //   .forEach(method => box.stub(logr, method).callsFake(noop))
  })

  afterEach(() => { box.restore() })

  context('exported keys and types', () => {
    const expected = {
      Endpoint: Function,
      GetEndpoint: Function,
      PostEndpoint: Function,
      Headers: Function,
      fetch: Function,
      promiseDataTo: Function,
      parseEndpoints: Function,
      urlToEndpoint: Function,
      promiseGet: Function
    }

    it('should export the expected keys', () => {
      const lib = require('../index.js')

      const libKeys = Object.keys(lib)

      const expectedKeys = Object.keys(expected)

      expect(libKeys).to.deep.equal(expectedKeys)
    })

    it('should export the expected keys', () => {
      const lib = require('../index.js')

      Object.keys(expected).forEach((key) => {
        expect(lib).to.have.property(key)
        expect(lib[key]).to.be.instanceof(expected[key])
      })
    })
  })
})
