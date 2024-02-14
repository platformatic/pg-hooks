#!/usr/bin/env node
'use strict'

const { join } = require('node:path')
const pino = require('pino')
const pretty = require('pino-pretty')
const minimist = require('minimist')
const { Generator } = require('../lib/generator')

async function execute () {
  const logger = pino(pretty({
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'hostname,pid'
  }))

  const args = minimist(process.argv.slice(2), {
    string: ['dir', 'port', 'hostname'],
    boolean: ['typescript', 'install', 'plugin', 'git'],
    default: {
      dir: join(process.cwd(), 'platformatic-pg-hooks-app'),
      port: 3042,
      hostname: '0.0.0.0',
      plugin: true,
      typescript: false,
      git: false,
      install: true
    }
  })

  const generator = new Generator({ logger })

  generator.setConfig({
    port: args.port,
    hostname: args.hostname,
    plugin: args.plugin,
    tests: args.plugin,
    typescript: args.typescript,
    initGitRepository: args.git,
    targetDirectory: args.dir
  })

  await generator.run()

  logger.info('Application created successfully! Run `npm run start` to start an application.')
}

execute()
