import { Generator as ServiceGenerator } from '@platformatic/service'
import { packageJson, schema } from './schema.js'

const defaultConnectionString = 'postgres://postgres:postgres@127.0.0.1:5432/postgres'

// We extend ServiceGenerator instead of DBGenerator because we
// do not want to allow users to have their own migrations.
export class Generator extends ServiceGenerator {
  constructor (opts = {}) {
    super({
      ...opts,
      module: '@platformatic/pg-hooks'
    })
  }

  getDefaultConfig () {
    const res = {
      ...super.getDefaultConfig(),
      plugin: false,
      tests: false
    }

    return res
  }

  getConfigFieldsDefinitions () {
    const serviceConfigFieldsDefs = super.getConfigFieldsDefinitions()
    return [
      ...serviceConfigFieldsDefs,
      {
        var: 'DATABASE_URL',
        label: 'What is the connection string?',
        default: defaultConnectionString,
        type: 'string',
        configValue: 'connectionString'
      }
    ]
  }

  async _getConfigFileContents () {
    const baseConfig = await super._getConfigFileContents()
    const dbUrlEnvVar = this.getEnvVarName('DB_URL')
    const config = {
      $schema: './stackable.schema.json',
      module: packageJson.name,
      db: {
        connectionString: `{${dbUrlEnvVar}}`
      },
      service: undefined
    }
    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    if (!this.config.isRuntimeContext) {
      this.addEnvVars(
        {
          PLT_SERVER_HOSTNAME: this.config.hostname,
          PLT_SERVER_LOGGER_LEVEL: 'info',
          PORT: 3042
        },
        { overwrite: false }
      )
    }

    this.addEnvVars(
      {
        DB_URL: this.config.connectionString || defaultConnectionString
      },
      { overwrite: false }
    )

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare () {
    this.addFile({
      path: '',
      file: 'stackable.schema.json',
      contents: JSON.stringify(schema, null, 2)
    })
  }
}
