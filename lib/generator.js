'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { Generator: ServiceGenerator } = require('@platformatic/service')
const { schema } = require('./schema')
const { generateGlobalTypesFile } = require('./templates/types')

const defaultConnectionString = 'postgres://postgres:postgres@127.0.0.1:5432/postgres'

// We extend ServiceGenerator instead of DBGenerator because we
// do not want to allow users to have their own migrations.
class PlatformaticPgHooksGenerator extends ServiceGenerator {
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
    const packageJson = await this.getStackablePackageJson()
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
      this.addEnvVars({
        PLT_SERVER_HOSTNAME: this.config.hostname,
        PLT_SERVER_LOGGER_LEVEL: 'info',
        PORT: 3042
      }, { overwrite: false })
    }

    this.addEnvVars({
      DB_URL: this.config.connectionString || defaultConnectionString
    }, { overwrite: false })

    const packageJson = await this.getStackablePackageJson()

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare () {
    const packageJson = await this.getStackablePackageJson()
    this.addFile({
      path: '',
      file: 'global.d.ts',
      contents: generateGlobalTypesFile(packageJson.name)
    })

    this.addFile({
      path: '',
      file: 'stackable.schema.json',
      contents: JSON.stringify(schema, null, 2)
    })
  }

  async getStackablePackageJson () {
    if (!this._packageJson) {
      const packageJsonPath = join(__dirname, '..', 'package.json')
      const packageJsonFile = await readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageJsonFile)

      if (!packageJson.name) {
        throw new Error('Missing package name in package.json')
      }

      if (!packageJson.version) {
        throw new Error('Missing package version in package.json')
      }

      this._packageJson = packageJson
      return packageJson
    }
    return this._packageJson
  }
}

module.exports = PlatformaticPgHooksGenerator
module.exports.Generator = PlatformaticPgHooksGenerator
