'use strict'

const { schema } = require('@platformatic/db')

const platformaticPgHooksSchema = {
  ...schema.schema,
  $id: 'platformatic-pg-hooks',
  title: 'Platformatic pg-hooks Config',
  properties: {
    ...schema.properties,
    module: { type: 'string' },
    hooks: {
      type: 'object',
      properties: {
        lock: {
          anyOf: [
            { type: 'number' },
            { type: 'string' }
          ]
        },
        leaderPoll: {
          anyOf: [
            { type: 'number' },
            { type: 'string' }
          ]
        }
      }
    }
  },
  $defs: {
    ...schema.$defs
  }
}

delete platformaticPgHooksSchema.properties.migrations
delete platformaticPgHooksSchema.properties.types

module.exports.schema = platformaticPgHooksSchema

if (require.main === module) {
  console.log(JSON.stringify(platformaticPgHooksSchema, null, 2))
}
