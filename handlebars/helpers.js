var Handlebars = require('handlebars')
var {htmlId} = require('bootprint-base/handlebars/helpers')

/* eslint-disable camelcase */

/**
 * Handlebars helpers for `bootprint-json-schema`
 * @name helpers
 */
module.exports = {
  json_schema__datatype,
  json_schema__subschema_name,
  json_schema__definition_id,
  json_schema__numeric_restrictions,
  json_schema__number_range,
  json_schema__could_be_numeric,
  json_schema__could_be_of_type,
  json_schema__doclink,
  json_schema__is_array,
  json_schema__split_coma,
  json_schema__is_required,
  json_schema__has_any,
  json_schema__enumerate,
  json_schema__count_range,
  json_schema__version,
  json_schema__is_version
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

function json_schema__definition_id (name) {
  return `definitions-${htmlId(name)}`
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

function json_schema__is_required (schema, propertyName) {
  return schema.required && schema.required.indexOf(propertyName) >= 0
}

function json_schema__count_range (min, max, singular, plural) {
  if (min == null && max == null) return null
  if (min === 1 && max == null) { return `at least one ${singular}` }
  if (min == null && max === 1) { return `at most one ${singular}` }
  if (min === 1 && max === 1) { return `exactly one ${singular}` }

  if (min != null && max == null) { return `at least ${min} ${plural}` }
  if (min == null && max != null) { return `at most ${max} ${plural}` }
  if (min === max) { return `exactly ${max} ${plural}` }

  if (min != null && max != null) { return `${min} to ${max} ${plural}` }
  return null
}

function json_schema__number_range (schema) {
  let min = schema.minimum
  let max = schema.maximum
  let minExclusive = schema.exclusiveMinimum
  let maxExclusive = schema.exclusiveMaximum
  // Convert draft 6 to draft 4
  if (typeof minExclusive === 'number') {
    min = minExclusive
    minExclusive = true
  }
  if (typeof maxExclusive === 'number') {
    max = maxExclusive
    maxExclusive = true
  }
  return range(min, minExclusive, max, maxExclusive, 'x')
}

/**
 * Render a range based on several
 * @param {number} min the minimal value or null if not present
 * @param {boolean} minExclusive whether "min" is outside the range
 * @param {number} max the maximal value or null if not present
 * @param {boolean} maxExclusive whether "max" is outside the range
 * @param {string} what a description for the current value
 */
function range (min, minExclusive, max, maxExclusive, what) {
  if (min != null && max != null) {
    return `${min} ${minExclusive ? '<' : '≤'} ${what} ${maxExclusive ? '<' : '≤'} ${max}`
  }
  if (min != null && max == null) {
    return `${what} ${minExclusive ? '>' : '≥'} ${min} `
  }
  if (min == null && max != null) {
    return `${what} ${maxExclusive ? '<' : '≤'} ${max}`
  }
  return null
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
function json_schema__doclink (type, sectionName, options) {
  if (!options.data || !options.data.$root) {
    throw new Error('Expected \'options\' to be a Handlebars options object')
  }
  let version = options.data.$root.$schema || defaultVersion
  let versionMetadata = supportedVersions[version]
  let name = versionMetadata.name
  let section = versionMetadata.sections[type][sectionName]
  return safe`<a href="${name}-${section}">${section}</a>`
}

/**
 *
 * @param {string} list a coma-separated list of strings
 * @return {string[]} the list items
 */
function json_schema__split_coma (list) {
  return list.split(',').map(item => item.trim())
}

function json_schema__is_array (value) {
  return Array.isArray(value)
}

function json_schema__has_any (schema, ...properties) {
  const realProperties = properties.slice(0, properties.length - 1)
  return realProperties.find(keyword => schema[keyword] != null)
}

/**
 * Convert an array into a prose-enumeration
 * @param {string[]} items an array of strings (e.g. ['a','b','c'])
 * @return an written enumeration (a,b and c)
 */
function json_schema__enumerate (items, options) {
  return items.map((item, index, array) => {
    item = options.fn(item)
    // Add coma after each but the two last items
    if (index < array.length - 2) {
      return item + ', '
    }
    // Add "and" after the next-to-last item
    if (index === array.length - 2) {
      return item + ' and '
    }
    return item
  }).join('')
}

const supportedVersions = {
  'http://json-schema.org/draft-06/schema#': {
    name: 'draft-06',
    docLink: 'https://tools.ietf.org/html/draft-wright-json-schema-validation-01#section',
    sections: {
      keywords: {
        'multipleOf': '6.1',
        'maximum': '6.2',
        'exclusiveMaximum': '6.3',
        'minimum': '6.4',
        'exclusiveMinimum': '6.5',
        'maxLength': '6.6',
        'minLength': '6.7',
        'pattern': '6.8',
        'items': '6.9',
        'items_array': '6.9',
        'additionalItems': '6.10',
        'minItems': '6.11',
        'maxItems': '6.12',
        'uniqueItems': '6.13',
        'contains': '6.14',
        'minProperties': '6.15',
        'maxProperties': '6.16',
        'required': '6.17',
        'properties': '6.18',
        'patternProperties': '6.19',
        'additionalProperties': '6.20',
        'dependencies': '6.21',
        'propertyNames': '6.22',
        'enum': '6.23',
        'const': '6.24',
        'type': '6.25',
        'allOf': '6.26',
        'anyOf': '6.27',
        'oneOf': '6.28',
        'not': '6.29',
        'default': '7.3',
        'examples': '7.4',
        'format': '8'
      },
      formats: {
        'date-time': '8.3.1',
        'email': '8.3.2',
        'hostname': '8.3.3',
        'ipv4': '8.3.4',
        'ipv6': '8.3.5',
        'uri': '8.3.6',
        'uri-reference': '8.3.7',
        'json-pointer': '8.3.9'
      }
    }
  },
  'http://json-schema.org/draft-04/schema#': {
    name: 'draft-04',
    docLink: 'https://tools.ietf.org/html/draft-fge-json-schema-validation-00',
    sections: {
      keywords: {
        'multipleOf': '5.1.1',
        'maximum': '5.1.2',
        'exclusiveMaximum': '5.1.2',
        'minimum': '5.1.3',
        'exclusiveMinimum': '5.1.3',
        'maxLength': '5.2.1',
        'minLength': '5.2.2',
        'pattern': '5.2.3',
        'items': '5.3.1',
        'items_array': '5.3.1',
        'additionalItems': '5.3.1',
        'minItems': '5.3.2',
        'maxItems': '5.3.3',
        'uniqueItems': '5.3.4',
        // 'contains': // TODO: Not in draft-04
        'minProperties': '5.4.2',
        'maxProperties': '5.4.1',
        'required': '5.4.3',
        'properties': '5.4.4',
        'patternProperties': '5.4.4', // TODO: Check again
        'additionalProperties': '5.4.4',
        'dependencies': '5.4.5',
        // 'propertyNames': '6.22', // TODO: Not in draft-04
        'enum': '5.5.1',
        // 'const': // TODO: Not in draft-04
        'type': '5.5.2',
        'allOf': '5.5.3',
        'anyOf': '5.5.4',
        'oneOf': '5.5.5',
        'not': '5.5.6',
        'default': '6.2.1',
        // 'examples': // TODO: Not in draft-04
        'format': '7'
      },
      formats: {
        'date-time': '7.3.1',
        'email': '7.3.2',
        'hostname': '7.3.3',
        'ipv4': '7.3.4',
        'ipv6': '7.3.5',
        'uri': '7.3.6'
        // 'uri-reference' // TODO: Not in draft-04
        // 'json-pointer': // TODO: Not in draft-04
      }
    }
  }
}

/**
 * The schema-version that is used if no $schema-tag is provided
 * @type {string}
 */
const defaultVersion = 'http://json-schema.org/draft-06/schema#'
/**
 * Returns the json-schema version of the input data based
 * on the "$schema"-property
 */
function json_schema__version (options) {
  if (!options.data || !options.data.$root) {
    throw new Error('Expected \'options\' to be a Handlebars options object')
  }
  if (!options.data.$root.$version) {
    return `Unspecified version (assuming ${defaultVersion})`
  }
  if (!supportedVersions[options.data.$root.$version]) {
    return 'Unkown version: ' + options.data.$root.$version
  }
  return supportedVersions[options.data.$root.$version]
}

/**
 * Returns true, if the version of the current schema matches the provided version
 * @param rootSchema
 */
function json_schema__is_version (options) {
  if (!options.data || !options.data.$root) {
    throw new Error('Expected \'options\' to be a Handlebars options object')
  }
  let version = options.data.$root.$schema || defaultVersion
  return supportedVersions[version]
}
