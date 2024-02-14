'use strict'

const { platformaticDB } = require('@platformatic/db')
const { buildServer } = require('@platformatic/service')
const { schema } = require('./lib/schema')
const { Generator } = require('./lib/generator')
const { join } = require('path')

async function stackable (fastify, opts) {
  await fastify.register(platformaticDB, opts)
}

stackable.configType = 'platformatic-pg-hooks-app'
stackable.schema = schema
stackable.Generator = Generator
stackable.configManagerConfig = {
  schema,
  envWhitelist: ['PORT', 'HOSTNAME'],
  allowToWatch: ['.env'],
  schemaOptions: {
    useDefaults: true,
    coerceTypes: true,
    allErrors: true,
    strict: false
  },
  async transformConfig () {
    this.current.migrations = {
      dir: join(__dirname, 'migrations'),
      autoApply: true
    }
    this.current.plugins ||= {}
    this.current.plugins.paths ||= []
    this.current.plugins.paths.push(join(__dirname, 'lib', 'plugin.js'))

    return platformaticDB.configManagerConfig.transformConfig.call(this)
  }
}

function _buildServer (opts) {
  return buildServer(opts, stackable)
}

// break Fastify encapsulation
stackable[Symbol.for('skip-override')] = true

module.exports = stackable
module.exports.schema = schema
module.exports.Generator = Generator
module.exports.buildServer = _buildServer
