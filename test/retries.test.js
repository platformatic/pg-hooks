import { EventEmitter, once } from 'events'
import Fastify from 'fastify'
import { deepStrictEqual, strictEqual } from 'node:assert'
import { test } from 'node:test'
import { adminSecret, createApplication } from './helper.js'

test('retries on failure', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  let called = 0
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    ee.emit('called')
    if (called++ === 0) {
      throw new Error('first call')
    }
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

  let p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
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
  p = once(ee, 'called')
  await p
})

test('send a message to the dead letter queue after retries are completed', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    throw new Error('This is down')
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const deadLetterTarget = Fastify()
  deadLetterTarget.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => deadLetterTarget.close())
  await deadLetterTarget.listen({ port: 0 })
  const deadLetterTargetURL = `http://localhost:${deadLetterTarget.server.address().port}`

  let deadLetterQueue
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
          callbackUrl: deadLetterTargetURL
        }
      }
    })
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    deadLetterQueue = data.saveQueue.id
    strictEqual(deadLetterQueue, '1')
  }

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
          mutation($callbackUrl: String!, $deadLetterQueueId: ID) {
            saveQueue(input: { name: "test", callbackUrl: $callbackUrl, method: "POST", deadLetterQueueId: $deadLetterQueueId, maxRetries: 1 }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl,
          deadLetterQueueId: deadLetterQueue
        }
      }
    })
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    strictEqual(queueId, '2')
  }

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
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

test('send a message to the dead letter queue after retries are completed without content-type', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    reply.status(500).send('This is down')
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const deadLetterTarget = Fastify()
  deadLetterTarget.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => deadLetterTarget.close())
  await deadLetterTarget.listen({ port: 0 })
  const deadLetterTargetURL = `http://localhost:${deadLetterTarget.server.address().port}`

  let deadLetterQueue
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
          callbackUrl: deadLetterTargetURL
        }
      }
    })
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    deadLetterQueue = data.saveQueue.id
    strictEqual(deadLetterQueue, '1')
  }

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
          mutation($callbackUrl: String!, $deadLetterQueueId: ID) {
            saveQueue(input: { name: "test", callbackUrl: $callbackUrl, method: "POST", deadLetterQueueId: $deadLetterQueueId, maxRetries: 1 }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl,
          deadLetterQueueId: deadLetterQueue
        }
      }
    })
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    strictEqual(queueId, '2')
  }

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
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

test('send a message to the dead letter queue after retries are completed with text/plain', async t => {
  const ee = new EventEmitter()
  const server = await createApplication(t)

  const target = Fastify()
  target.post('/', (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    reply.status(500).headers({ 'content-type': 'text/plain' }).send('This is down')
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const deadLetterTarget = Fastify()
  deadLetterTarget.post('/', async (req, reply) => {
    deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is strictEqual')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => deadLetterTarget.close())
  await deadLetterTarget.listen({ port: 0 })
  const deadLetterTargetURL = `http://localhost:${deadLetterTarget.server.address().port}`

  let deadLetterQueue
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
          callbackUrl: deadLetterTargetURL
        }
      }
    })
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    deadLetterQueue = data.saveQueue.id
    strictEqual(deadLetterQueue, '1')
  }

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
          mutation($callbackUrl: String!, $deadLetterQueueId: ID) {
            saveQueue(input: { name: "test", callbackUrl: $callbackUrl, method: "POST", deadLetterQueueId: $deadLetterQueueId, maxRetries: 1 }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl,
          deadLetterQueueId: deadLetterQueue
        }
      }
    })
    strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    const { data } = body
    queueId = data.saveQueue.id
    strictEqual(queueId, '2')
  }

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
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
