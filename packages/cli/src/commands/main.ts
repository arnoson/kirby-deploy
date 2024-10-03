import { defineCommand } from 'citty'
import consola from 'consola'
import { colors } from 'consola/utils'
import { readFileSync } from 'fs'
import { join, relative } from 'path/posix'
import { cwd } from 'process'
import { loadConfig } from '../config'
import { cat } from '../lftp/cat'
import { sync } from '../sync'
import { getBranch } from '../utils'
import { accountsPull, accountsPush } from './accounts'
import { contentPull, contentPush } from './content'
import { languagesPull, languagesPush } from './languages'

export const main = defineCommand({
  run: async ({ rawArgs, cmd }) => {
    // Todo: find a cleaner way to prevent the main command from running when
    // when a sub command is run.
    const [firstArg] = rawArgs
    const subCommands = Object.keys(cmd.subCommands ?? {})
    const isSubCommand = subCommands.includes(firstArg)
    if (isSubCommand) return

    const config = await loadConfig()
    if (!config) return

    const { folderStructure } = config
    const exclude = [
      ...config.exclude,
      '^node_modules/',
      `^${relative(cwd(), folderStructure.content)}`,
      `^${relative(cwd(), folderStructure.media)}`,
      `^${relative(cwd(), folderStructure.accounts)}`,
      `^${relative(cwd(), folderStructure.sessions)}`,
      `^${relative(cwd(), folderStructure.cache)}`,
      `^${relative(cwd(), join(folderStructure.site, 'languages'))}`,
    ]
    const excludeGlob = [...config.excludeGlob, '.*', '.*/']
    const include = config.include
    const includeGlob = [...config.includeGlob, '.htaccess', '.vite/']

    const branch = getBranch()
    const displaySource = branch ? colors.cyan(` ${branch} `) : ' '
    const displayDestination = colors.magenta(
      join(config.host, config.remoteDir),
    )
    consola.log(`🚀 Deploy${displaySource}to ${displayDestination}\n`)

    if (config.checkComposerLock) {
      const localComposerLock = readFileSync('./composer.lock', {
        encoding: 'utf-8',
      })
      const remoteComposerLock = cat('./composer.lock', config)
      const skipVendor = localComposerLock === remoteComposerLock
      if (skipVendor) {
        exclude.push('^vendor/', '^kirby/')
        consola.info('Skipping vendor\n')
      }
    }

    await sync('./', 'push', {
      ...config,
      exclude,
      excludeGlob,
      include,
      includeGlob,
    })
  },
  subCommands: {
    ['content-push']: contentPush,
    ['content-pull']: contentPull,

    ['accounts-push']: accountsPush,
    ['accounts-pull']: accountsPull,

    ['languages-push']: languagesPush,
    ['languages-pull']: languagesPull,
  },
})
