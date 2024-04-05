import { loadConfig as load } from 'c12'
import consola from 'consola'
import { flatten, parse } from 'valibot'
import { Config, ConfigResolved, ConfigSchema, FolderStructure } from './types'

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

  let folderStructure: FolderStructure
  config.folderStructure ??= 'flat'
  if (config.folderStructure === 'public') {
    folderStructure = {
      content: 'content',
      media: 'public/media',
      accounts: 'storage/accounts',
      sessions: 'storage/sessions',
      cache: 'storage/cache',
    }
  } else if (config.folderStructure === 'flat') {
    // 'flat' structure is the default.
    folderStructure = {
      content: 'content',
      media: 'site/media',
      accounts: 'site/accounts',
      sessions: 'site/sessions',
      cache: 'site/cache',
    }
  } else {
    folderStructure = config.folderStructure
  }

  const configResolved = {
    remoteDir: './',
    dryRun: true,
    verbose: false,
    parallel: 10,
    checkComposerLock: true,
    callWebhooks: true,
    exclude: [],
    excludeGlob: [],
    include: [],
    includeGlob: [],
    ...config,
    folderStructure,
    lftpSettings: {
      'ftp:ssl-force': true,
      ...config.lftpSettings,
    },
    lftpFlags: ['--parallel=10', '--dereference', ...(config.lftpFlags ?? [])],
  } satisfies ConfigResolved

  return configResolved
}
