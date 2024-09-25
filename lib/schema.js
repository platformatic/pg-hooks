'use strict'

const { schema } = require('@platformatic/db')
const { version } = require('../package.json')

const platformaticPgHooksSchema = {
  ...schema.schema,
  $id: `https://schemas.platformatic.dev/@platformatic/pg-hooks/${version}.json`,
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
