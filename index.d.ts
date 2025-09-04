import { BaseCapability } from '@platformatic/basic'
import { ConfigurationOptions } from '@platformatic/foundation'
import { BaseGenerator } from '@platformatic/generators'
import { ServiceCapability, ServerInstance as ServiceServerInstance } from '@platformatic/service'
import { JSONSchemaType } from 'ajv'
import { FastifyInstance } from 'fastify'
import { PlatformaticPgHooksConfiguration } from './config'

export { PlatformaticPgHooksConfiguration } from './config'

export type PgHooksCapability = ServiceCapability<PlatformaticPgHooksConfiguration>

export type ServerInstance = ServiceServerInstance<PlatformaticPgHooksConfiguration>

export function create (
  root: string,
  source?: string | PlatformaticPgHooksConfiguration,
  context?: ConfigurationOptions
): Promise<PgHooksCapability>

export declare function pgHooks (app: FastifyInstance, capability: BaseCapability): Promise<void>

export class Generator extends BaseGenerator.BaseGenerator {}

export declare const packageJson: Record<string, unknown>

export declare const schema: JSONSchemaType<PlatformaticPgHooksConfiguration>

export declare const schemaComponents: {
  hooks: JSONSchemaType<object>
}

export declare const version: string
