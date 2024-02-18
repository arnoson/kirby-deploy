import { defineCommand } from 'citty'
import consola from 'consola'
import { colors } from 'consola/utils'
import { join } from 'path/posix'
import { loadConfig } from '../config'
import { sync } from '../sync'
import { getBranch, upperFirst } from '../utils'

const syncContent = async (mode: 'pull' | 'push') => {
  const config = await loadConfig()
  if (!config) return

  const { content } = config.folderStructure
  const source = `./${content}/`

  const branch = getBranch()
  const displaySource = colors.magenta(
    `${source}${branch ? colors.cyan(` (${branch})`) : ''}`,
  )
  const displayDestination = colors.magenta(
    join(config.host, config.remoteDir, source),
  )
  const direction = mode === 'pull' ? 'from' : 'to'
  consola.log(
    `🗂️  ${upperFirst(mode)} ${displaySource} ${direction} ${displayDestination}\n`,
  )

  return sync(source, mode, {
    ...config,
    // User provided includes/excludes can only be used in the main command
    // because they are relative to the base directory, so we reset them.
    exclude: [],
    excludeGlob: ['.*', '.*/'],
    include: [],
    includeGlob: [],
  })
}

export const contentPush = defineCommand({ run: () => syncContent('push') })
export const contentPull = defineCommand({ run: () => syncContent('pull') })
