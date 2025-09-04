import createConnectionPool, { sql } from '@databases/pg'
import { after, beforeEach } from 'node:test'
import { Agent, setGlobalDispatcher } from 'undici'
import { create } from '../index.js'

setGlobalDispatcher(
  new Agent({
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
)

export const adminSecret = 'admin-secret'

export async function getConfig () {}

export async function createApplication (t) {
  const server = await create(import.meta.dirname, {
    server: {
      port: 0,
      logger: { level: 'error' }
    },
    db: {
      connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/postgres'
    },
    authorization: {
      adminSecret
    },
    hooks: {
      leaderPoll: 1000
    }
  })

  t.after(async () => {
    await server.close()
  })

  await server.init()
  return server
}

let pool
beforeEach(cleanDatabase)
after(() => pool.dispose())

export async function cleanDatabase () {
  pool ??= createConnectionPool({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/postgres',
    bigIntMode: 'bigint'
  })

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
  } catch (err) {}
}
