'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { Generator: ServiceGenerator } = require('@platformatic/service')
const { schema } = require('./schema')
const { generateGlobalTypesFile } = require('./templates/types')

class PlatformaticPgHooksGenerator extends ServiceGenerator {
  getDefaultConfig () {
    const defaultBaseConfig = super.getDefaultConfig()
    const defaultConfig = {
      greeting: 'Hello world!'
    }
    return Object.assign({}, defaultBaseConfig, defaultConfig)
  }

  getConfigFieldsDefinitions () {
    const serviceConfigFieldsDefs = super.getConfigFieldsDefinitions()
    return [
      ...serviceConfigFieldsDefs,
      {
        var: 'PLT_GREETING_TEXT',
        label: 'What should the stackable greeting say?',
        default: 'Hello world!',
        type: 'string'
      }
    ]
  }

  async _getConfigFileContents () {
    const baseConfig = await super._getConfigFileContents()
    const packageJson = await this.getStackablePackageJson()
    const config = {
      $schema: './stackable.schema.json',
      module: packageJson.name,
      greeting: {
        text: '{PLT_GREETING_TEXT}'
      }
    }
    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    this.config.env = {
      PLT_GREETING_TEXT: this.config.greeting ?? 'Hello world!',
      ...this.config.env
    }

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
