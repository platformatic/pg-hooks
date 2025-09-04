import { create as createDatabase, transform as databaseTransform, platformaticDatabase } from '@platformatic/db'
import { resolve } from 'node:path'
import { plugin } from './lib/plugin.js'
import { schema } from './lib/schema.js'

export async function pgHooks (app, capability) {
  await platformaticDatabase(app, capability)
  await app.register(plugin, capability)
}

export async function transform (config, ...args) {
  config = await databaseTransform(config, ...args)

  config.migrations = { dir: resolve(import.meta.dirname, 'migrations'), autoApply: true }

  return config
}

export async function create (configOrRoot, sourceOrConfig, context) {
  return createDatabase(configOrRoot, sourceOrConfig, { schema, applicationFactory: pgHooks, transform, ...context })
}

export { Generator } from './lib/generator.js'
export { packageJson, schema, schemaComponents, version } from './lib/schema.js'
