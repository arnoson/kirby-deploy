import { defineCommand } from "citty"
import consola from "consola"
import { join, relative } from "path/posix"
import { loadConfig } from "../config"
import { sync } from "../sync"

const syncAccounts = async (mode: 'pull' | 'push') => {
  const config = await loadConfig()
  if (!config) return

  const { accounts } = config.folderStructure
  const source = `./${ accounts }/`
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