'use strict'

const { beforeEach, afterEach } = require('node:test')
const { join } = require('path')
const { setGlobalDispatcher, Agent } = require('undici')
const pgHooks = require('..')
const createConnectionPool = require('@databases/pg')

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
}))

const adminSecret = 'admin-secret'

async function getConfig () {
  const config = {}
  config.module = join(__dirname, '..')
  config.server = {
    port: 0,
    logger: { level: 'error' }
  }
  config.db = {
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/postgres'
  }
  config.authorization = {
    adminSecret
  }
  config.hooks = {
    leaderPoll: 1000
  }
  return { config }
}

async function buildServer (t) {
  const { config } = await getConfig()
  const server = await pgHooks.buildServer(config)
  t.after(() => server.close())
  return server
}

let pool = null
beforeEach(cleandb)
afterEach(async () => {
  await pool.dispose()
  pool = null
})

async function cleandb () {
  // TODO reuse the conenction across runs
  pool = createConnectionPool({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/postgres',
    bigIntMode: 'bigint'
  })

  const sql = createConnectionPool.sql

  // TODO use schemas
  try {
    await pool.query(sql`DROP TABLE MESSAGES;`)
  } catch {}
  try {
    await pool.query(sql`DROP TABLE CRONS;`)
  } catch {}
  try {
    await pool.query(sql`DROP TABLE QUEUES;`)
  } catch {}
  try {
    await pool.query(sql`DROP TABLE VERSIONS;`)
  } catch (err) {
  }
}

module.exports.getConfig = getConfig
module.exports.adminSecret = adminSecret
module.exports.buildServer = buildServer
module.exports.cleandb = cleandb
