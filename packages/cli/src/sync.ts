import consola from 'consola'
import { join } from 'path/posix'
import { logMirror, mirror } from './lftp/mirror'
import { ConfigResolved } from './types'
import { callWebhook, confirm, upperFirst } from './utils'

export const sync = async (
  source: string,
  mode: 'pull' | 'push',
  config: ConfigResolved,
): Promise<boolean> => {
  const reverse = mode === 'push'
  const targetName = mode === 'push' ? 'remote' : 'local'
  const webhook = `${config.url}/plugin-kirby-deploy`
  const destination =
    source === './' ? config.remoteDir : `./${join(config.remoteDir, source)}`

  const flags = [
    '--continue',
    '--only-newer',
    '--overwrite',
    '--use-cache',
    '--delete',
    '--verbose',
    `--parallel=${config.parallel}`,
    '--dereference',
    reverse && '--reverse',
    ...config.exclude.map((path: string) => `--exclude ${path}`),
    ...config.excludeGlob.map((path: string) => `--exclude-glob ${path}`),
    ...config.includeGlob.map((path: string) => `--include-glob ${path}`),
    ...config.include.map((path: string) => `--include ${path}`),
  ].filter(Boolean) as string[]

  if (config.verbose) {
    logMirror(source, destination, flags, config)
  }

  if (config.dryRun) {
    consola.log('Review changes...')
    consola.log('') // empty line

    const { hasChanges } = await mirror(
      source,
      destination,
      [...flags, '--dry-run'],
      config,
    )

    if (!hasChanges) {
      consola.success(`${upperFirst(targetName)} already up to date`)
      return false
    }

    const shouldContinue = await confirm(`Apply changes to ${targetName}?`)
    if (!shouldContinue) return false
    consola.log('') // empty line
  }

  consola.log('Apply changes...\n')

  // Make sure the finish hook is called even if an unexpected error occurs.
  if (config.callWebhooks) await callWebhook(`${webhook}/start`, config.token)
  let hasChanges, hasErrors
  try {
    ;({ hasChanges, hasErrors } = await mirror(
      source,
      destination,
      flags,
      config,
    ))
  } catch (e) {
    consola.error(e)
    return false
  } finally {
    if (config.callWebhooks) {
      await callWebhook(`${webhook}/finish`, config.token)
    }
  }

  if (!hasChanges) {
    consola.success(`${upperFirst(targetName)} already up to date`)
    return false
  }

  consola.log('') // empty line
  consola.success(
    hasErrors ? 'All done (but with errors, see output above)!' : 'All done!',
  )
  return true
}
