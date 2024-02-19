import { spawnSync } from 'child_process'
import consola from 'consola'
import { platform } from 'os'
import { ConfigResolved } from '../types'

export const cat = (file: string, config: ConfigResolved) => {
  const settings = {
    'ftp:ssl-force': true,
    'ssl:verify-certificate': config.verifyCertificate,
  }

  const commands = [
    ...Object.entries(settings).map(([key, value]) => `set ${key} ${value}`),
    `open ${config.host}`,
    `user ${config.user} ${config.password}`,
    `cat ${file}`,
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
