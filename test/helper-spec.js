/* global describe */
/* global it */

const chai = require('chai')
const expect = chai.expect
chai.use(require('dirty-chai'))

var helpers = require('../handlebars/helpers/index')
var Handlebars = require('handlebars').create()
Handlebars.registerHelper(helpers)

function run (template, json) {
  return Handlebars.compile(template)(json)
}

describe('The Handlebars-helpers:', function () {
  describe('the helper "json_schema__could_be_numeric"', function () {
    function testWith (schemaObject) {
      return helpers.json_schema__could_be_numeric.call(schemaObject)
    }

    it('should return true, if the type is integer', function () {
      expect(testWith({type: 'integer'})).to.be.true()
    })
    it('should return true, if the type is number', function () {
      expect(testWith({type: 'number'})).to.be.true()
    })
    it('should return true, if the type is undefined', function () {
      expect(testWith({})).to.be.true()
    })
    it('should return true, if the integer is part of the type-array', function () {
      expect(testWith({type: ['string', 'integer']})).to.be.true()
    })
    it('should return true, if the numeber is part of the type-array', function () {
      expect(testWith({type: ['string', 'number']})).to.be.true()
    })
    it('should return false, if type is string', function () {
      expect(testWith({type: 'string'})).to.be.false()
    })
    it('should return false, if type is an array without number or integer', function () {
      expect(testWith({type: ['string', 'object']})).to.be.false()
    })
  })

  describe('the helper "json_schema__could_be_of_type"', function () {
    function testWith (type, schemaObject) {
      return helpers.json_schema__could_be_of_type.call(schemaObject, type)
    }

    it('should return true, if the type matches directly', function () {
      expect(testWith('string', {type: 'string'})).to.be.true()
    })
    it('should return true, if the type is undefined', function () {
      expect(testWith('string', {})).to.be.true()
    })
    it('should return true, if the type is part of the type-array', function () {
      expect(testWith('string', {type: ['string', 'integer']})).to.be.true()
    })
    it('should return false, if type does not match', function () {
      expect(testWith('string', {type: 'object'})).to.be.false()
    })
    it('should return false, if type is an array without the expected type', function () {
      expect(testWith('array', {type: ['string', 'object']})).to.be.false()
    })
  })

  describe('the json_schema__datatype helper', function () {
    // Call the datatype-helper
    function dt (obj, types) {
      // The callee of the helper should always pass 2 arguments
      types = types || (obj && obj.type)
      return helpers.json_schema__datatype.call({}, obj, types)
    }

    it('should handle undefined gracefully', function () {
      expect(dt(undefined)).to.be.null()
    })

    it('should handle null gracefully', function () {
      expect(dt(null)).to.be.null()
    })

    it('should return any, if no type is specified ', function () {
      expect(dt({})).to.equal('*')
    })

    it('should concatate multiple types with a pipe', function () {
      expect(dt({type: ['string', 'integer']})).to.equal('string|integer')
    })

    it('should treat arrays with unspecific types as array<*>', function () {
      expect(dt({type: 'array', items: {}})).to.equal('array<*>')
    })

    it('should write type[] for specific arrays', function () {
      expect(dt({type: 'array', items: {type: 'string'}})).to.equal('array<string>')
    })

    it('should write recurse multiple steps of array types', function () {
      expect(dt({type: 'array', items: {type: 'array', items: {type: 'string'}}})).to.equal('array<array<string>>')
    })

    it('should write concatenated types as generic array paramters', function () {
      expect(dt({type: 'array', items: {type: ['string', 'integer']}})).to.equal('array<string|integer>')
    })

    it('should write array-items only to the array type of a multi-type', function () {
      expect(dt({type: ['integer', 'array'], items: {type: ['string']}})).to.equal('integer|array<string>')
    })
  })

  describe('the json_schema__range helper', function () {
    // Call the datatype-helper
    function range (obj) {
      return run('{{{json_schema__range range}}}', {range: obj})
    }

    it('should handle empty ranges gracefully', function () {
      expect(range({})).to.equal('')
    })

    it('should handle empty integer ranges gracefully', function () {
      expect(range({type: 'integer'})).to.equal('')
    })

    it('should handle empty number ranges gracefully', function () {
      expect(range({type: 'number'})).to.equal('')
    })

    it('should ignore minimum and maximum for non-numeric types', function () {
      expect(range({type: 'string', minimum: 2, maximum: 3})).to.equal('')
    })

    it('should render a range for only minimum (starting with coma)', function () {
      expect(range({minimum: 2, type: 'number'})).to.equal(', { x ∈ ℝ | x ≥ 2 }')
    })

    it('should render a range for only maximum (starting with coma)', function () {
      expect(range({maximum: 2, type: 'number'})).to.equal(', { x ∈ ℝ | x ≤ 2 }')
    })

    it('should render a range with minimum and maximum (starting with coma)', function () {
      expect(range({maximum: 2, minimum: 0, type: 'number'})).to.equal(', { x ∈ ℝ | 0 ≤ x ≤ 2 }')
    })

    it('should render a open range with minimumExclusive (starting with coma)', function () {
      expect(range({minimum: 0, minimumExclusive: true, type: 'number'})).to.equal(', { x ∈ ℝ | x > 0 }')
    })

    it('should render a open range with maximumExclusive (starting with coma)', function () {
      expect(range({maximum: 2, maximumExclusive: true, type: 'number'})).to.equal(', { x ∈ ℝ | x < 2 }')
    })

    it('should render a range with minimumExclusive and maximum (starting with coma)', function () {
      expect(range({
        maximum: 2,
        minimum: 0,
        minimumExclusive: true,
        type: 'number'
      })).to.equal(', { x ∈ ℝ | 0 < x ≤ 2 }')
    })

    it('should render a range with minimum and maximumExclusive (starting with coma)', function () {
      expect(range({
        maximum: 2,
        maximumExclusive: true,
        minimum: 0,
        type: 'number'
      })).to.equal(', { x ∈ ℝ | 0 ≤ x < 2 }')
    })

    it('should render the correct set-symbol for integers', function () {
      expect(range({type: 'integer', minimum: 0})).to.equal(', { x ∈ ℤ | x ≥ 0 }')
    })
  })
})
