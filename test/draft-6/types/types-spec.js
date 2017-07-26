/*!
 * bootprint-json-schema <https://github.com/nknapp/bootprint-json-schema>
 *
 * Copyright (c) 2017 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global describe */
/* global it */
/* global before */
var expect = require('chai').expect

var tester = require('bootprint-unit-testing')

describe('draft-06: The types-property', function () {
  this.timeout(10000)
  var bptest = tester(require('../../..'), __dirname, require('./schema.json'))

  // Run bootprint. The parsed "index.html"-file (cheerio) is then available
  // under "bptest.$"
  before(bptest.run)

  it('should show simple types', function () {
    expect(bptest.textIn('#definition-simpleInteger .json-schema--schema')).to.equal('Type: integer')
    expect(bptest.textIn('#definition-simpleString .json-schema--schema')).to.equal('Type: string')
  })

  it('should show alternative types separated by "or"', function () {
    expect(bptest.textIn('#definition-stringOrInteger .json-schema--schema')).to.equal('Type: string or integer')
  })

  it('should show unspecified types as "any"', function () {
    expect(bptest.textIn('#definition-unspecified .json-schema--schema')).to.equal('Type: any type')
  })

  it('should show an array as "array<*>" if no items-type is specified', function () {
    expect(bptest.textIn('#definition-simpleArray .json-schema--schema')).to.equal('Type: array<*>')
  })

  it('should apply items-types to the array type ', function () {
    expect(bptest.textIn('#definition-stringOrStringArray .json-schema--schema')).to.equal('Type: string or array<string>')
  })
})
