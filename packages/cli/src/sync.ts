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
  const webhookBase = `${config.url}/plugin-kirby-deploy`
  const shouldCallWebhooks = mode === 'push' && config.callWebhooks
  const destination =
    source === './' ? config.remoteDir : `./${join(config.remoteDir, source)}`

  if (shouldCallWebhooks && !config.token) {
    consola.error('token needed to call webhooks')
    return false
  }

  if (shouldCallWebhooks && !config.url) {
    consola.error('url needed to call webhooks')
    return false
  }

  const flags = [
    '--continue',
    '--only-newer',
    '--overwrite',
    '--use-cache',
    '--delete',
    '--verbose',
    reverse && '--reverse',
    ...config.exclude.map((path: string) => `--exclude ${path}`),
    ...config.excludeGlob.map((path: string) => `--exclude-glob ${path}`),
    ...config.includeGlob.map((path: string) => `--include-glob ${path}`),
    ...config.include.map((path: string) => `--include ${path}`),
    ...config.lftpFlags,
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

  if (shouldCallWebhooks) {
    await callWebhook(`${webhookBase}/start`, config.token!)
  }
  // Make sure the finish hook is called even if an unexpected error occurs.
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
    if (shouldCallWebhooks) {
      await callWebhook(`${webhookBase}/finish`, config.token!)
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
