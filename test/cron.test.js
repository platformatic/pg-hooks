'use strict'

const { buildServer, adminSecret } = require('./helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const tspl = require('@matteo.collina/tspl')
const Fastify = require('fastify')

test('happy path', async (t) => {
  const plan = tspl(t, { plan: 6 })
  const ee = new EventEmitter()
  const server = await buildServer(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let queueId
  {
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query: `
          mutation($callbackUrl: String!) {
            saveQueue(input: { name: "test", callbackUrl: $callbackUrl, method: "POST" }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl
        }
      }
    })
    plan.strictEqual(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    queueId = data.saveQueue.id
    plan.strictEqual(queueId, '1')
  }

  const p1 = once(ee, 'called')
  const schedule = '*/1 * * * * *'

  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const query = `
      mutation($body: String!, $queueId: ID, $schedule: String!) {
        saveCron(input: { queueId: $queueId, headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body, schedule: $schedule }) {
          id
          schedule
        }
      }
    `

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query,
        variables: {
          body: msg,
          queueId,
          schedule
        }
      }
    })
    const body = res.json()
    plan.strictEqual(res.statusCode, 200)

    const { data } = body
    plan.strictEqual(data.saveCron.schedule, schedule)

    /*
     * Add items
     *
     *     items {
     *       id
     *       when
     *     }
     *
     * plan.strictEqual(data.saveCron.items.length, 1)
     * const item = data.saveCron.items[0]
     * const when = new Date(item.when)
     * plan.strictEqual(when.getTime() - now <= 1000, true)
     */
  }

  await p1

  const p2 = once(ee, 'called')
  await p2
})

test('invalid cron expression', async (t) => {
  const plan = tspl(t, { plan: 4 })
  const server = await buildServer(t)

  const targetUrl = 'http://localhost:4242'

  let queueId
  {
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query: `
          mutation($callbackUrl: String!) {
            saveQueue(input: { name: "test", callbackUrl: $callbackUrl, method: "POST" }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl
        }
      }
    })
    plan.strictEqual(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    queueId = data.saveQueue.id
    plan.strictEqual(queueId, '1')
  }

  const schedule = 'hello world'

  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const query = `
      mutation($body: String!, $queueId: ID, $schedule: String!) {
        saveCron(input: { queueId: $queueId, headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body, schedule: $schedule }) {
          id
          schedule
        }
      }
    `

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query,
        variables: {
          body: msg,
          queueId,
          schedule
        }
      }
    })
    const body = res.json()
    plan.strictEqual(res.statusCode, 200)
    plan.deepStrictEqual(body.errors[0].message, 'Invalid cron expression')
  }
})
