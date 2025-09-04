import { BaseCapability } from '@platformatic/basic'
import { BaseGenerator } from '@platformatic/generators'
import {
  ApplicationCapability,
  ServerInstance as ApplicationInstance,
  ConfigurationOptions
} from '@platformatic/service'
import { JSONSchemaType } from 'ajv'
import { FastifyInstance } from 'fastify'
import { PlatformaticPgHooksConfiguration } from './config'

export { PlatformaticService } from '@platformatic/service'
export { PlatformaticPgHooksConfiguration } from './config'

export type PgHooksCapability = ApplicationCapability<PlatformaticPgHooksConfiguration>

export type ServerInstance = ApplicationInstance<PlatformaticPgHooksConfiguration>

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
