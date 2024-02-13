/// <reference path="../index.d.ts" />
'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  const config = fastify.platformatic.config
  const greeting = config.greeting
  fastify.log.info({ greeting }, 'Loading stackable greeting plugin.')
  fastify.decorate('greeting', greeting)
}
