'use strict'

const { buildServer, adminSecret } = require('./helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const tspl = require('@matteo.collina/tspl')
const Fastify = require('fastify')

test('happy path', async (t) => {
  const plan = tspl(t, { plan: 5 })
  const ee = new EventEmitter()
  const server = await buildServer(t)

  const target = Fastify()
  const p = once(ee, 'called')
  let called = false
  target.post('/', async (req, reply) => {
    // This if block is to make sure that the first request waits
    // for the second to complete
    if (!called) {
      called = true
      await p
    } else {
      ee.emit('called')
    }

    plan.ok('request completed')
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

  {
    const query = `
      mutation($messages: [MessageInput]!) {
        insertMessages(inputs: $messages) {
          id
          when
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
          messages: [{
            body: JSON.stringify({ message: 'HELLO FOLKS!' }),
            queueId
          }, {
            body: JSON.stringify({ message: 'HELLO FOLKS2!' }),
            queueId
          }]
        }
      }
    })
    plan.strictEqual(res.statusCode, 200)
  }

  await p
  await new Promise(resolve => setImmediate(resolve))
})
