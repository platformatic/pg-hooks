import { deepStrictEqual, throws } from 'node:assert/strict'
import { test } from 'node:test'
import { computeBackoff } from '../lib/backoff.js'

test('negative maxRetries', async t => {
  await throws(() => {
    computeBackoff({ maxRetries: -1 })
  })
})

test('computeBackoff', async t => {
  deepStrictEqual(computeBackoff({ retries: 0, maxRetries: 5 }), { retries: 1, maxRetries: 5, waitFor: 100 })
  deepStrictEqual(computeBackoff({ retries: 1, maxRetries: 5 }), { retries: 2, maxRetries: 5, waitFor: 200 })
  deepStrictEqual(computeBackoff({ retries: 2, maxRetries: 5 }), { retries: 3, maxRetries: 5, waitFor: 400 })
  deepStrictEqual(computeBackoff({ retries: 3, maxRetries: 5 }), { retries: 4, maxRetries: 5, waitFor: 800 })
  deepStrictEqual(computeBackoff({ retries: 4, maxRetries: 5 }), { retries: 5, maxRetries: 5, waitFor: 1600 })
  deepStrictEqual(computeBackoff({ retries: 5, maxRetries: 5 }), false)
})
