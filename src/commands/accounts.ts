import { defineCommand } from 'citty'
import consola from 'consola'
import { colors } from 'consola/utils'
import { join } from 'path/posix'
import { loadConfig } from '../config'
import { sync } from '../sync'
import { getBranch, upperFirst } from '../utils'

const syncAccounts = async (mode: 'pull' | 'push') => {
  const config = await loadConfig()
  if (!config) return

  const { accounts } = config.folderStructure
  const source = `./${accounts}/`

  const branch = await getBranch()
  const displaySource = colors.magenta(
    `${source}${branch ? colors.cyan(` (${branch})`) : ''}`,
  )
  const displayDestination = colors.magenta(
    join(config.host, config.remoteDir, source),
  )
  const direction = mode === 'pull' ? 'from' : 'to'
  consola.log(
    `🔑 ${upperFirst(mode)} ${displaySource} ${direction} ${displayDestination}\n`,
  )

  return sync(source, mode, {
    ...config,
    // User provided includes/excludes can only be used in the main command
    // because they are relative to the base directory, so we reset them.
    exclude: [],
    excludeGlob: ['.*', '.*/'],
    include: ['.htpasswd'], // Make sure account passwords are synced.
    includeGlob: [],
  })
}

export const accountsPush = defineCommand({ run: () => syncAccounts('push') })
export const accountsPull = defineCommand({ run: () => syncAccounts('pull') })
