export function generateGlobalTypesFile (npmPackageName) {
  return `import { FastifyInstance } from 'fastify'
import { PlatformaticPgHooksConfig, PlatformaticApp } from '${npmPackageName}'
  
declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticPgHooksConfig>
  }
}
`
}
