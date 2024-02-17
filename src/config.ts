import { loadConfig as load } from 'c12'
import consola from 'consola'
import { flatten, parse } from 'valibot'
import { Config, ConfigResolved, ConfigSchema } from './types'

export const loadConfig = async (): Promise<ConfigResolved | null> => {
  let { config, configFile } = await load<Config>({
    name: 'kirby-deploy',
    dotenv: true,
  })

  if (!config) {
    consola.error(new Error('no config file found'))
    return null
  }

  // Validate
  try {
    parse(ConfigSchema, config)
  } catch (e: any) {
    const issues = flatten<typeof ConfigSchema>(e).nested
    const info = Object.entries(issues)
      .map(([key, messages]) => `  - ${key} (${messages.join(', ')})`)
      .join('\n')
    consola.error(`Invalid properties in ${configFile}\n${info}`)
    return null
  }

  // Resolve shorthands
  if (config.folderStructure === 'flat') {
    config.folderStructure = {
      content: 'content',
      media: 'site/media',
      accounts: 'site/accounts',
      sessions: 'site/sessions',
      cache: 'site/cache',
    }
  } else {
    config.folderStructure = {
      content: 'content',
      media: 'public/media',
      accounts: 'storage/accounts',
      sessions: 'storage/sessions',
      cache: 'storage/cache',
    }
  }

  config = {
    remoteDir: './',
    dryRun: true,
    parallel: 10,
    verifyCertificate: true,
    exclude: [],
    excludeGlob: [],
    include: [],
    includeGlob: [],
    ...config,
  }

  return config as ConfigResolved
}
