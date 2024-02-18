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
import { ConfigResolved } from '../types'
import { platform } from 'os'
import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'

const readRemoteComposerLock = (config: ConfigResolved) => {
  const settings = [
    `set ftp:ssl-force true`,
    `set ssl:verify-certificate ${config.verifyCertificate}`,
  ]

  const commands = [
    ...settings,
    `open ${config.host}`,
    `user ${config.user} ${config.password}`,
    `cat ./composer.lock`,
    'bye',
  ]

  const isWindows = platform() === 'win32'
  const child = isWindows
    ? spawnSync('wsl', ['lftp', '-c', commands.join('; ')], {
        encoding: 'utf-8',
      })
    : spawnSync('lftp', ['-c', commands.join('; ')], { encoding: 'utf-8' })

  if (child.stderr) consola.error(child.stderr)
  return child.stdout
}

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

    const branch = getBranch()
    const displaySource = branch ? colors.cyan(` ${branch} `) : ''
    const displayDestination = colors.magenta(
      join(config.host, config.remoteDir),
    )
    consola.log(`🚀 Deploy${displaySource}to ${displayDestination}\n`)

    if (config.checkComposerLock) {
      const localComposerLock = readFileSync('./composer.lock', {
        encoding: 'utf-8',
      })
      const remoteComposerLock = readRemoteComposerLock(config)
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
  },
})
