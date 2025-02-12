'require strict'

/* eslint-env mocha */
/* eslint-disable import/no-unresolved, no-unused-expressions */

describe('promise-data-to', () => {
  const sinon = require('sinon')
  const { spy } = require('sinon')
  const { expect } = require('chai')
  const cleanrequire = require('@everymundo/cleanrequire')

  const Endpoint = require('../classes/Endpoint.class')
  const loadLib = () => cleanrequire('../lib/promise-data-to')

  const noop = () => { }

  // eslint-disable-next-line one-var-declaration-per-line
  let box

  // const logr = require('@everymundo/simple-logr')
  const zlib = require('zlib')

  beforeEach(() => {
    box = sinon.createSandbox()
    // ['log', 'info', /* 'debug',  */'error']
    //   .forEach(method => box.stub(logr, method).callsFake(noop))
  })

  afterEach(() => { box.restore() })

  describe('#promiseDataTo', () => {
    // eslint-disable-next-line one-var-declaration-per-line
    let httpRequest, httpEmitter, httpResponse

    const http = require('http')
    const { EventEmitter } = require('events')

    const newEmitter = () => {
      const emitter = new EventEmitter()
      emitter.headers = {}
      emitter.setEncoding = noop

      return emitter
    }

    const newHttpEmitter = (response) => {
      const emitter = newEmitter()

      emitter.response = response
      emitter.write = data => response.emit('data', Buffer.from(data))
      emitter.end = () => response.emit('end')
      emitter.abort = sinon.spy(() => response.emit('end'))

      return emitter
    }

    beforeEach(() => {
      httpRequest = box.stub(http, 'request')
      httpResponse = newEmitter()
      httpEmitter = newHttpEmitter(httpResponse)
    })

    /* const config = {
      http,
      host: 'localhost',
      port: 80,
      path: '/path',
      endpoint: 'http://localhost:80/path',
      headers: { Authorization: 'Authorization' }
    } */

    const endpoint = new Endpoint('http://Authorization@localhost:80/path')

    context('When response is a simple statusCode 200', () => {
      beforeEach(() => {
        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          callback(httpResponse)

          return httpEmitter
        })
      })

      context('Calling setHeaders', () => {
        const libSetHeaders = cleanrequire('../lib/set-headers.js')

        beforeEach(() => {
          box.stub(libSetHeaders, 'setHeaders')
        })

        it('should call setHeaders passing the correct arguments', () => {
          const data = { a: 1, b: 2, c: 3 }
          const expectedData = require('zlib').gzipSync(JSON.stringify(data)).toString('base64')

          const { promiseDataTo } = loadLib()
          const customConfig = Endpoint.clone(endpoint)
          const headers = customConfig.headers.toObject()

          customConfig.http = http
          customConfig.compress = 'gzip'

          return promiseDataTo(customConfig, data)
            .then(() => {
              expect(libSetHeaders.setHeaders).to.have.property('calledOnce', true)

              expect(libSetHeaders.setHeaders.args[0]).to.deep.equal([headers, expectedData, 'gzip'])
            })
        })
      })

      it('should throw an error when an endpoint is falsy', async () => {
        const { promiseDataTo } = loadLib()
        let hasThrown = false

        try {
          await promiseDataTo(null)
        } catch (error) {
          expect(error).to.be.instanceof(Error)
          expect(error.message).to.contain('EM: INVALID ENDPOINT')
          hasThrown = true
        }

        expect(hasThrown).to.be.true
      })

      it('should success when status is between 200 and 299 using http', () => {
        const data = { a: 1, b: 2, c: 3 }

        const expectedData = JSON.stringify(data)
        const { promiseDataTo } = loadLib()
        const customConfig = Endpoint.clone(endpoint)
        customConfig.headers = undefined

        return promiseDataTo(customConfig, data)
          .then((stats) => {
            expect(stats.code).to.equal(200)
            expect(stats).to.have.property('resTxt', expectedData)
            expect(stats).to.have.property('err', undefined)
          })
      })

      it('should success requesting endpoint as a string', () => {
        const data = { a: 1, b: 2, c: 3 }

        const expectedData = JSON.stringify(data)
        const expectedRequestHeaders = {
          'content-type': 'application/json',
          'content-length': 19,
          authorization: 'something'
        }

        const { promiseDataTo } = require('../lib/promise-data-to')
        const url = 'http://lala.com/something/else?a=10&b=20'
        const headers = { Authorization: 'something', 'content-type': 'application/json' }

        return promiseDataTo(url, data, { headers })
          .then((response) => {
            expect(response.code).to.equal(200)
            expect(response).to.have.property('resTxt', expectedData)
            expect(response).to.have.property('requestHeaders')
            expect(response.requestHeaders).to.deep.equal(expectedRequestHeaders)
            expect(response).to.have.property('err', undefined)
          })
      })

      it('should match resTxt and responseText from response', () => {
        const data = { a: 1, b: 2, c: 3 }

        const expectedData = JSON.stringify(data)
        const { promiseDataTo } = require('../lib/promise-data-to')
        const url = 'http://lala.com/something/else?a=10&b=20'

        return promiseDataTo(url, data, { headers: { Authorization: 'something' } })
          .then((response) => {
            expect(response.code).to.equal(200)
            expect(response).to.have.property('resTxt', expectedData)
            expect(response).to.have.property('responseText', expectedData)
            expect(response).to.have.property('err', undefined)
          })
      })

      it('should match statusCode and code from response', () => {
        const data = { a: 1, b: 2, c: 3 }

        const expectedData = JSON.stringify(data)
        const { promiseDataTo } = require('../lib/promise-data-to')
        const url = 'http://lala.com/something/else?a=10&b=20'

        return promiseDataTo(url, data, { headers: { Authorization: 'something' } })
          .then((response) => {
            expect(response.code).to.equal(200)
            expect(response).to.have.property('resTxt', expectedData)
            expect(response).to.have.property('statusCode', 200)
            expect(response).to.have.property('err', undefined)
          })
      })

      it('should success when status is between 200 and 299 using protocol', () => {
        const data = { a: 1, b: 2, c: 3 }
        const expectedData = JSON.stringify(data)
        const { promiseDataTo } = loadLib()
        const protoConfig = Endpoint.clone(endpoint)

        return promiseDataTo(protoConfig, data)
          .then((stats) => {
            expect(stats.code).to.equal(200)
            expect(stats).to.have.property('resTxt', expectedData)
            expect(stats).to.have.property('err', undefined)
          })
      })

      it('should success when status is between 200 and 299 using protocol and query', () => {
        const data = { a: 1, b: 2, c: 3 }
        const expectedData = JSON.stringify(data)
        const { promiseDataTo } = loadLib()
        const protoConfig = Endpoint.clone(endpoint)
        // delete protoConfig.http
        protoConfig.protocol = 'http:'
        protoConfig.query = { name: 'Daniel', features: ['awesome', 'handsome'] }

        return promiseDataTo(protoConfig, data)
          .then((stats) => {
            expect(stats.code).to.equal(200)
            expect(stats).to.have.property('resTxt', expectedData)
            expect(stats).to.have.property('err', undefined)
          })
      })

      it('should success when status is between 200 and 299 using protocol and method=GET', () => {
        const { promiseDataTo } = require('../lib/promise-data-to')
        const protoConfig = Endpoint.clone(endpoint)
        // protoConfig.http = undefined
        // protoConfig.protocol = 'http:'
        protoConfig.method = 'GET'

        return promiseDataTo(protoConfig)
          .then((stats) => {
            expect(stats.code).to.equal(200)
            expect(stats).to.have.property('resTxt', '')
            expect(stats).to.have.property('err', undefined)
          })
      })
    })

    context('READ compressed response', () => {
      const expected = JSON.stringify({ name: 'Daniel', awesome: true })
      const { promiseDataTo } = require('../lib/promise-data-to')

      it('should properly decompress response when content-encoding header is GZIP', async () => {
        httpEmitter.write = function write () {
          this.response.emit('data', zlib.gzipSync(expected))
        }

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          httpResponse.headers = { 'content-encoding': 'gzip' }
          callback(httpResponse)

          return httpEmitter
        })

        const stats = await promiseDataTo(endpoint, {})

        expect(stats.code).to.equal(200)
        expect(stats).to.have.property('resTxt', expected)
        expect(stats).to.have.property('err', undefined)
      })

      it('should properly decompress response when content-encoding header is DEFLATE', async () => {
        httpEmitter.write = function write () {
          this.response.emit('data', zlib.deflateSync(expected))
        }

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          httpResponse.headers = { 'content-encoding': 'deflate' }
          callback(httpResponse)

          return httpEmitter
        })

        const stats = await promiseDataTo(endpoint, {})

        expect(stats.code).to.equal(200)
        expect(stats).to.have.property('responseText', expected)
        expect(stats).to.have.property('err', undefined)
      })

      it('should properly decompress response when content-encoding header is BR (brotli)', async () => {
        httpEmitter.write = function write () {
          this.response.emit('data', zlib.brotliCompressSync(expected))
        }

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          httpResponse.headers = { 'content-encoding': 'br' }
          callback(httpResponse)

          return httpEmitter
        })

        const stats = await promiseDataTo(endpoint, {})

        expect(stats.code).to.equal(200)
        expect(stats).to.have.property('responseText', expected)
        expect(stats).to.have.property('err', undefined)
      })

      it('should properly decompress response when content-encoding header is BR (brotli)', async () => {
        httpEmitter.write = function write () {
          this.response.emit('data', zlib.brotliCompressSync(expected))
        }

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          httpResponse.headers = { 'content-encoding': 'br' }
          callback(httpResponse)

          return httpEmitter
        })

        const stats = await promiseDataTo(endpoint, {})

        expect(stats.code).to.equal(200)
        expect(stats).to.have.property('responseText', expected)
        expect(stats).to.have.property('err', undefined)
      })

      it('should not decompress response when content-encoding header none of the expected', async () => {
        httpEmitter.write = function write () {
          this.response.emit('data', Buffer.from(expected))
        }

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          httpResponse.headers = { 'content-encoding': 'something-else' }
          callback(httpResponse)

          return httpEmitter
        })

        const stats = await promiseDataTo(endpoint, {})

        expect(stats.code).to.equal(200)
        expect(stats).to.have.property('responseText', expected)
        expect(stats).to.have.property('err', undefined)
      })
    })

    it('should REJECT when status 2** and response GZIP throws and error', async () => {
      httpRequest.callsFake((options, callback) => {
        httpResponse.statusCode = 200
        httpResponse.headers = { 'content-encoding': 'gzip' }
        callback(httpResponse)

        return httpEmitter
      })

      const { promiseDataTo } = loadLib()

      const response = await promiseDataTo(endpoint, 'something')
      const caller = () => response.responseText

      expect(caller).to.throw(Error, 'incorrect header check')
    })

    it('should reject when status is between 400', () => {
      httpRequest.callsFake((options, callback) => {
        httpResponse.statusCode = 400
        callback(httpResponse)

        return httpEmitter
      })

      const { promiseDataTo } = loadLib()

      const secret = Math.random()

      return promiseDataTo(endpoint, '')
        .catch((error) => {
          expect(error).to.be.instanceof(Error)
          expect(error).to.have.property('message', '400 Status')

          return secret
        })
        .then(res => expect(res).to.equal(secret, 'It did not reject'))
    })

    context('when process.env.SIMULATE is set', () => {
      const simulateLib = require('../lib/simulate-response')

      beforeEach(() => {
        box.stub(process.env, 'SIMULATE').value('1')
        if (!process.env.REQUEST_TIMEOUT_MS) process.env.REQUEST_TIMEOUT_MS = ''

        box.stub(process.env, 'REQUEST_TIMEOUT_MS').value('1000')
        spy(simulateLib, 'simulatedResponse')
      })

      afterEach(() => { })

      it('should succeed', () => {
        const dataObject = { a: 1, b: 2, c: 3 }
        const dataArray = [dataObject]
        const dataString = JSON.stringify(dataArray)
        // const expectedData = '{"success":true,"data":[]}'

        const invalidAttempt = NaN

        httpRequest.callsFake((options, callback) => {
          callback(httpResponse)

          return httpEmitter
        })

        const thenFunction = spy((stats) => {
          expect(stats.code).to.equal(222)
          // expect(stats).to.have.property('responseText', expectedData)
          expect(stats).to.have.property('start')
          expect(stats).to.have.property('end')
          expect(stats).to.have.property('err', undefined)
        })

        const { promiseDataTo } = loadLib()

        return promiseDataTo(endpoint, dataObject)
          .then(thenFunction)
          .then(() => promiseDataTo(endpoint, dataArray))
          .then(thenFunction)
          .then(() => promiseDataTo(endpoint, dataString, invalidAttempt))
          .then(thenFunction)
          .then(() => {
            expect(thenFunction).to.have.property('calledThrice', true)
            expect(simulateLib.simulatedResponse).to.have.property('calledThrice', true)
          })
      })
    })

    context('when status is is between 300 and 399', () => {
      // beforeEach(() => {})

      it('should fail', () => {
        const data = [{ a: 1, b: 2, c: 3 }]

        const expectedData = JSON.stringify(data)

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 302
          callback(httpResponse)

          return httpEmitter
        })

        const { promiseDataTo } = loadLib()
        return promiseDataTo(endpoint, data)
          .then((stats) => {
            expect(stats.code).to.equal(302)
            expect(stats).to.have.property('err')
            expect(stats).to.have.property('resTxt', expectedData)
          })
      })
    })

    context('when it times out', () => {
      let socket

      beforeEach(() => {
        socket = new EventEmitter()
        socket.setTimeout = () => socket.emit('timeout')
        httpEmitter.abort = sinon.spy()
        httpRequest.callsFake((options, callback) => {
          callback(httpResponse)

          return httpEmitter
        })
      })

      it('should fail', () => {
        // const socket = new EventEmitter()
        // socket.setTimeout = (timeMS) => socket.emit('timeout')
        // httpEmitter.abort = sinon.spy()
        // httpRequest.callsFake((options, callback) => {
        //   callback(httpResponse)

        //   return httpEmitter
        // })

        const { promiseDataTo } = require('../lib/promise-data-to')
        const myEndpoint = Endpoint.clone(endpoint)
        myEndpoint.timeout = 1
        return promiseDataTo(myEndpoint, {})
          .then(() => {
            httpEmitter.emit('socket', socket)
            expect(httpEmitter.abort).to.have.property('calledOnce', true)
          })
      })

      context('when timeout is not a Number', () => {
        it('should throw an Error', async () => {
          const { promiseDataTo } = require('../lib/promise-data-to')
          const myEndpoint = Endpoint.clone(endpoint)
          myEndpoint.timeout = 'XX'

          return promiseDataTo(myEndpoint, {})
            .then(() => { throw new Error('Not Expected Error') })
            .catch((error) => {
              expect(error).to.be.instanceof(Error)
              expect(error).to.have.property('message', `timeout param is not a number [${myEndpoint.timeout}]`)
            })
        })
      })
    })

    context('when status >= 400', () => {
      beforeEach(() => {
        box.stub(process.env, 'MAX_RETRY_ATTEMPTS').value('1')
        box.stub(process.env, 'RETRY_TIMEOUT_MS').value('0')
      })

      it('should fail', (done) => {
        const
          data = { a: 1, b: 2 }

        const expectedData = JSON.stringify(data)

        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 404
          callback(httpResponse)

          return httpEmitter
        })

        const { promiseDataTo } = loadLib()
        promiseDataTo(endpoint, data)
          .catch((stats) => {
            expect(stats).to.have.property('err')
            expect(stats).to.have.property('resTxt', expectedData)
            expect(stats.code).to.equal(404)
            done()
          })
      })
    })

    context('when there is connection error', () => {
      beforeEach(() => {
        box.stub(process.env, 'MAX_RETRY_ATTEMPTS').value('2')
        box.stub(process.env, 'RETRY_TIMEOUT_MS').value('1')
      })

      it('Errors with a connection error', (done) => {
        const
          data = { a: 1, b: 2, c: 3 }

        const expectedData = JSON.stringify(data)

        httpRequest.callsFake((options, callback) => {
          callback(httpResponse)
          httpEmitter = newHttpEmitter(httpResponse)
          httpEmitter.end = () => httpEmitter.emit('error', new Error('FakeError'))
          return httpEmitter
        })

        const lib = cleanrequire('../lib/promise-data-to')
        expect(lib).to.have.property('MAX_RETRY_ATTEMPTS', 2)
        expect(lib).to.have.property('RETRY_TIMEOUT_MS', 1)

        const { promiseDataTo } = loadLib()
        promiseDataTo(endpoint, data)
          .catch((stats) => {
            expect(stats).to.have.property('err')
            expect(stats).to.not.have.property('resTxt', expectedData)
            expect(stats.code).to.equal(599)
            done()
          })
      })
    })

    context('when method is passed on the options object', () => {
      beforeEach(() => {
        httpRequest.callsFake((options, callback) => {
          httpResponse.statusCode = 200
          callback(httpResponse)

          return httpEmitter
        })
      })
      it('should success when status is between 200 and 299 using http', () => {
        const data = { a: 1, b: 2, c: 3 }

        const expectedData = JSON.stringify(data)
        const { promiseDataTo } = loadLib()
        const customConfig = Endpoint.clone(endpoint)
        customConfig.headers = undefined
        const options = { method: 'PUT' }
        return promiseDataTo(customConfig, data, options)
          .then((stats) => {
            expect(stats.method).to.equal('PUT')
            expect(stats.code).to.equal(200)
            expect(stats).to.have.property('resTxt', expectedData)
            expect(stats).to.have.property('err', undefined)
          })
      })
    })
  })

  context('when env vars don\'t have value', () => {
    let MAX_RETRY_ATTEMPTS
    let RETRY_TIMEOUT_MS

    beforeEach(() => {
      MAX_RETRY_ATTEMPTS = process.env.MAX_RETRY_ATTEMPTS
      delete process.env.MAX_RETRY_ATTEMPTS

      RETRY_TIMEOUT_MS = process.env.RETRY_TIMEOUT_MS
      delete process.env.RETRY_TIMEOUT_MS
    })

    it('should set the default values', () => {
      const lib = cleanrequire('../lib/promise-data-to')
      expect(lib).to.have.property('MAX_RETRY_ATTEMPTS', 3)
      expect(lib).to.have.property('RETRY_TIMEOUT_MS', 500)
    })

    afterEach(() => {
      process.env.MAX_RETRY_ATTEMPTS = MAX_RETRY_ATTEMPTS
      process.env.RETRY_TIMEOUT_MS = RETRY_TIMEOUT_MS
    })
  })
})
