import { EventEmitter, once } from 'events'
import Fastify from 'fastify'
import { deepStrictEqual, strictEqual } from 'node:assert'
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
          queueId
        }
      }
    })
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    strictEqual(when.getTime() - now >= 0, true)
  }

  await p
})

test('`text plain` content type', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, 'HELLO FOLKS!', 'message is strictEqual')
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

  const p = once(ee, 'called')
  {
    const msg = 'HELLO FOLKS!'
    const now = Date.now()
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query: `
          mutation($body: String!, $queueId: ID) {
            saveMessage(input: { queueId: $queueId, body: $body, headers: "{ \\"content-type\\": \\"text/plain\\" }" } ) {
              id
              when
            }
          }
        `,
        variables: {
          body: msg,
          queueId
        }
      }
    })
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)
    const { data } = body
    const when = new Date(data.saveMessage.when)
    strictEqual(when.getTime() - now >= 0, true)
  }

  await p
})

test('future when', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    ee.emit('called', Date.now())
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

  const p = once(ee, 'called')
  const now = Date.now()

  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const afterOneSecond = new Date(now + 1000).toISOString()
    const query = `
      mutation($body: String!, $queueId: ID, $when: DateTime!) {
        saveMessage(input: { queueId: $queueId, body: $body, when: $when  }) {
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
          body: msg,
          queueId,
          callbackUrl: targetUrl,
          when: afterOneSecond
        }
      }
    })
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)

    const { data } = body
    strictEqual(data.saveMessage.when, afterOneSecond)
  }

  const [calledAt] = await p
  strictEqual(calledAt - now >= 1000, true)
})

test('only admins can write', async t => {
  const server = await createApplication(t)

  const targetUrl = 'http://localhost:4242'

  {
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
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
    strictEqual(body.errors[0].message, 'operation not allowed')
  }

  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const query = `
      mutation($body: String!, $queueId: ID) {
        saveMessage(input: { queueId: $queueId, body: $body }) {
          id
          when
        }
      }
    `

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query,
        variables: {
          body: msg,
          queueId: 1
        }
      }
    })
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)
    strictEqual(body.errors[0].message, 'operation not allowed')
  }
})

test('`text plain` content type header in the Queue', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, 'HELLO FOLKS!', 'message is strictEqual')
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
            saveQueue(input: { name: "test", callbackUrl: $callbackUrl, method: "POST", headers: "{ \\"content-type\\": \\"text/plain\\" }" }) {
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

  const p = once(ee, 'called')
  {
    const msg = 'HELLO FOLKS!'
    const now = Date.now()
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'X-PLATFORMATIC-ADMIN-SECRET': adminSecret
      },
      payload: {
        query: `
          mutation($body: String!, $queueId: ID) {
            saveMessage(input: { queueId: $queueId, body: $body } ) {
              id
              when
            }
          }
        `,
        variables: {
          body: msg,
          queueId
        }
      }
    })
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)
    const { data } = body
    const when = new Date(data.saveMessage.when)
    strictEqual(when.getTime() - now >= 0, true)
  }

  await p
})

test('happy path w buildStackable', async t => {
  const ee = new EventEmitter()

  const server = await createApplication(t)

  await server.start()
  t.after(() => server.stop())

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
          queueId
        }
      }
    })
    const body = JSON.parse(res.body)
    strictEqual(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    strictEqual(when.getTime() - now >= 0, true)
  }

  await p
})
