import { EventEmitter, once } from 'events'
import Fastify from 'fastify'
import { ok, strictEqual } from 'node:assert'
import { test } from 'node:test'
import { adminSecret, createApplication } from './helper.js'

test('happy path', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

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

    ok('request completed')
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
          messages: [
            {
              body: JSON.stringify({ message: 'HELLO FOLKS!' }),
              queueId
            },
            {
              body: JSON.stringify({ message: 'HELLO FOLKS2!' }),
              queueId
            }
          ]
        }
      }
    })
    strictEqual(res.statusCode, 200)
  }

  await p
  await new Promise(resolve => setImmediate(resolve))
})
