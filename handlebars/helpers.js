var Handlebars = require('handlebars')

/* eslint-disable camelcase */

/**
 * Handlebars helpers for `bootprint-json-schema`
 * @name helpers
 */
module.exports = {
  json_schema__datatype,
  json_schema__subschema_name,
  json_schema__numeric_restrictions,
  json_schema__string_restrictions,
  json_schema__could_be_numeric,
  json_schema__could_be_of_type,
  json_schema__array_item_restrictions,
  json_schema__doclink,
  json_schema__is_array
}

/**
 * Return true, if the type is numeric (integer or number) or *could be numeric*
 *
 * The type *could be* numeric, if it is an array that includes number or integer,
 * or if it is not specified.
 *
 * @this {undefined|string|string[]} the json-schema oject
 */
function json_schema__could_be_numeric () {
  var could_be_a = json_schema__could_be_of_type.bind(this)
  return could_be_a('number') || could_be_a('integer')
}

/**
 * Return true, if the type is a string or *could be* a string
 *
 * The type *could be* string, if it is an array that includes number or integer,
 * or if it is not specified.
 *
 * @param {string} type  the type property of the schema
 */
function json_schema__could_be_of_type (type) {
  const actualType = this.type
  return (actualType === null) ||   // type not defined
    (actualType === undefined) ||
    actualType === type || // explicit check matches
    (Array.isArray(actualType) && actualType.indexOf(type) >= 0) // array contains type
}

/**
 * Returns a formal string that can be used generic parameter for an array.
 * @param {object} schema a json-schema
 * @param {string|string[]} types one or more types of potentially multiple types in the schema that should be used right now.
 * @returns {String} a string like <code>string[]</code> or <code>object[][]</code>
 * @access public
 * @memberOf helpers
 */
function json_schema__datatype (schema, types) {
  if (schema == null) {
    return null
  }
  /**
   * The type(s) that are processed
   * @type {string|string[]}
   */
  if (types == null) {
    return '*'
  }
  if (Array.isArray(types)) {
    // "type" is an array (i.e. multiple types) -> process each type
    return types.map(type => json_schema__datatype(schema, type)).join('|')
  }
  // "type" is a string
  if (types === 'array') {
    let items = schema.items || {}
    return `array<${json_schema__datatype(items, items.type)}>`
  }
  return types
}

/**
 * Extract then name of a subschema from a $ref property
 * @param {string} url
 * @returns {*}
 * @access public
 * @memberOf helpers
 */
function json_schema__subschema_name (url) {
  return url.replace('#/definitions/', '')
}

/**
 * Computes numeric restrictions based on properties of the given json-schema.
 *
 * If exclusiveMinimum or exclusiveMaximum is a boolean, it will be treated as defined in
 * https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1
 *
 * If it is a number, it will be treated as in
 * https://tools.ietf.org/html/draft-wright-json-schema-validation-01
 *
 * @param schema a json-schema object with minimum, maximum, exclusiveMinimum, exclusiveMaximum and multipleOf
 * @param {number=} [schema.minimum]
 * @param {number=} [schema.maximum]
 * @param {string} [schema.type] the json-type (integer, or number)
 * @param {boolean|number=} [schema.minimumExclusive]
 * @param {boolean|number=} [schema.maximumExclusive]
 * @param {number=} [schema.multipleOf]
 * @access public
 * @memberOf helpers
 */
function json_schema__numeric_restrictions (schema) {
  let min = schema.minimum
  let max = schema.maximum
  let minExclusive = schema.minimumExclusive
  let maxExclusive = schema.maximumExclusive
  // Convert draft 4 to draft 6
  if (minExclusive === true) {
    minExclusive = min
    min = null
  }
  if (maxExclusive === true) {
    maxExclusive = max
    max = null
  }

  return [
    min != null && `x ≥ ${min}`,
    max != null && `x ≤ ${max}`,
    minExclusive != null && `x > ${minExclusive}`,
    maxExclusive != null && `x < ${maxExclusive}`,
    schema.multipleOf != null && `x \u2208 ${schema.multipleOf}*\u2124` // ELEMENT OF - DOUBLE-STRUCK CAPITAL Z
  ].filter(x => x)
}

function json_schema__string_restrictions (schema, options) {
  return [
    schema.minLength != null && `x.length ≥ ${schema.minLength}`,
    schema.maxLength != null && `x.length ≤ ${schema.maxLength}`,
    schema.pattern != null && safe`x matches <span class="json-schema--regex">${schema.pattern}</span>`
  ].filter(x => x)
}

function json_schema__array_item_restrictions (schema, options) {
  return [
    schema.minItems != null && schema.maxItems != null && `The array must have ${schema.minItems} to ${schema.maxItems} items.`,
    schema.minItems == null && schema.maxItems != null && `The array must have at most ${schema.maxItems} items.`,
    schema.minItems != null && schema.maxItems == null && `The array must have at least ${schema.minItems} items.`,
    schema.uniqueItems != null && 'The items of the array must be unique'
  ].filter(x => x)
}

function safe (strings, ...values) {
  let escapedValues = values.map(Handlebars.Utils.escapeExpression)
  let rawString = String.raw.apply(this, [strings].concat(escapedValues))
  return new Handlebars.SafeString(rawString)
}

/**
 * Render a link to a json-schema docs section from the json-schema documentation
 * @param {string} sectionName the section name (e.g. items)
 * @param options
 */
function json_schema__doclink (sectionName, options) {
  let section = sections[sectionName]
  let description = descriptions[sectionName]
  let text = ''
  if (options && options.hash && options.hash.text) {
    text = description
  }
  return safe`${text} (<a href="${schemaBase}-${section}" title="${description}">🛈 ${section}</a>)`
}

const schemaBase = 'https://tools.ietf.org/html/draft-wright-json-schema-validation-01#section'

const descriptions = {
  'items': 'All items must match the following schema',
  'items_array': 'The first items must match the following schemas',
  'contains': 'At least one item must match the following schema',
  'additionalItems': 'Additional items must match the following schema'
}

const sections = {
  'items': '6.9',
  'items_array': '6.9',
  'contains': '6.14',
  'additionalItems': '6.10'
}

function json_schema__is_array (value) {
  return Array.isArray(value)
}