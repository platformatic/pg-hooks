'use strict'

const { schema } = require('@platformatic/service')

const platformaticPgHooksSchema = {
  ...schema.schema,
  $id: 'platformatic-pg-hooks',
  title: 'Platformatic pg-hooks Config',
  properties: {
    ...schema.schema.properties,
    module: { type: 'string' },
    greeting: {
      type: 'object',
      properties: {
        text: {
          type: 'string'
        }
      },
      required: ['text'],
      additionalProperties: false
    }
  }
}

module.exports.schema = platformaticPgHooksSchema

if (require.main === module) {
  console.log(JSON.stringify(platformaticPgHooksSchema, null, 2))
}
