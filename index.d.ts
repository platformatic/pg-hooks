import { FastifyInstance } from 'fastify'
import { PlatformaticApp } from '@platformatic/service'
import { PlatformaticPgHooksConfig } from './config'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticPgHooksConfig>
  }
}

export { PlatformaticApp, PlatformaticPgHooksConfig }
