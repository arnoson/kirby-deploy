import { defineCommand } from "citty"
import consola from "consola"
import { join, relative } from "path/posix"
import { loadConfig } from "../config"
import { sync } from "../sync"

const syncContent = async (mode: 'pull' | 'push') => {
  const config = await loadConfig()
  if (!config) return

  const { content } = config.folderStructure
  const source = `./${ content }/`
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
export const contentPull = defineCommand({ run: () => syncContent('push') })
