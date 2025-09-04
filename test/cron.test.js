import { deepStrictEqual, equal, strictEqual } from 'assert'
import { EventEmitter, once } from 'events'
import Fastify from 'fastify'
import { test } from 'node:test'
import { adminSecret, createApplication } from './helper.js'

test('happy path', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
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
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    strictEqual(queueId, '1')
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
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)

    const { data } = body
    strictEqual(data.saveCron.schedule, schedule)

    /*
     * Add items
     *
     *     items {
     *       id
     *       when
     *     }
     *
     * strictEqual(data.saveCron.items.length, 1)
     * const item = data.saveCron.items[0]
     * const when = new Date(item.when)
     * strictEqual(when.getTime() - now <= 1000, true)
     */
  }

  await p1

  const p2 = once(ee, 'called')
  await p2

  // We must have one sent and one scheduled message
  const messages = await server.getApplication().platformatic.entities.message.find()
  equal(messages.length, 2)
  const sentMessage = messages.filter(m => m.sentAt !== null)[0]
  const unsentMessage = messages.filter(m => m.sentAt === null)[0]
  strictEqual(sentMessage.queueId, Number(queueId))
  strictEqual(unsentMessage.queueId, Number(queueId))
})

test('invalid cron expression', async t => {
  const server = await createApplication(t)

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
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    strictEqual(queueId, '1')
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
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)
    deepStrictEqual(body.errors[0].message, 'Invalid cron expression')
  }
})
