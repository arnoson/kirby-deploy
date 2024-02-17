import { defineCommand } from 'citty'
import { relative, join } from 'path/posix'
import { cwd } from 'process'
import { loadConfig } from '../config'
import { sync } from '../sync'
import { accountsPull, accountsPush } from './accounts'
import { contentPull, contentPush } from './content'
import { getBranch } from '../utils'
import { colors } from 'consola/utils'
import consola from 'consola'

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
    ]
    const excludeGlob = [...config.excludeGlob, '.*', '.*/']
    const include = config.include
    const includeGlob = [...config.includeGlob, '.htaccess']

    const branch = await getBranch()
    const displaySource = branch ? colors.cyan(` ${branch} `) : ''
    const displayDestination = colors.magenta(
      join(config.host, config.remoteDir),
    )
    consola.log(`🚀 Deploy${displaySource}to ${displayDestination}\n`)

    sync('./', 'push', {
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
  },
})
