import { EventEmitter, once } from 'events'
import Fastify from 'fastify'
import { deepStrictEqual } from 'node:assert'
import { test } from 'node:test'
import { adminSecret, createApplication } from './helper.js'

test('happy path', async t => {
  const ee = new EventEmitter()
  const server1 = await createApplication(t)
  const server2 = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is equal')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let queueId
  {
    const res = await server1.inject({
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
    deepStrictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    deepStrictEqual(queueId, '1')
  }

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
    const query = `
      mutation($body: String!, $queueId: ID) {
        saveMessage(input: { queueId: $queueId, headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body  }) {
          id
          when
        }
      }
    `

    const res = await server2.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query,
        variables: {
          body: msg,
          queueId
        }
      }
    })
    const body = JSON.parse(res.body)
    deepStrictEqual(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    deepStrictEqual(when.getTime() - now >= 0, true)
  }

  await p
})

test('re-election', async t => {
  const ee = new EventEmitter()
  const server1 = await createApplication(t)
  const server2 = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is equal')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let queueId
  {
    const res = await server1.inject({
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
    deepStrictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    deepStrictEqual(queueId, '1')
  }

  await server1.close()

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
    const query = `
      mutation($body: String!, $queueId: ID) {
        saveMessage(input: { queueId: $queueId, headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body  }) {
          id
          when
        }
      }
    `

    const res = await server2.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query,
        variables: {
          body: msg,
          queueId
        }
      }
    })
    const body = JSON.parse(res.body)
    deepStrictEqual(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    deepStrictEqual(when.getTime() - now >= 0, true)
  }

  await p
})
