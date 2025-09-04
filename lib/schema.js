import { schema as dbSchema } from '@platformatic/db'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const packageJson = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf-8'))
export const version = packageJson.version

export const hooks = {
  type: 'object',
  properties: {
    lock: {
      anyOf: [{ type: 'number' }, { type: 'string' }]
    },
    leaderPoll: {
      anyOf: [{ type: 'number' }, { type: 'string' }]
    }
  }
}

export const schemaComponents = {
  hooks
}

export const schema = structuredClone(dbSchema)

schema.$id = `https://schemas.platformatic.dev/@platformatic/pg-hooks/${packageJson.version}.json`
schema.title = 'Platformatic pg-hooks configuration'
schema.version = packageJson.version
schema.properties.hooks = hooks
delete schema.properties.migrations
delete schema.properties.types
