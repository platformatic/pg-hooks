#!/usr/bin/env node
'use strict'
  
const stackable = require('../index')
const { start } = require('@platformatic/service')
const { printAndExitLoadConfigError } = require('@platformatic/config')
  
start(stackable, process.argv.splice(2)).catch(printAndExitLoadConfigError)
