import { spawnSync } from 'child_process'
import { consola } from 'consola'
import { platform } from 'os'
import { ConfigResolved } from '../types'

export const cat = (
  file: string,
  { host, user, password, lftpSettings }: ConfigResolved,
) => {
  const commands = [
    ...Object.entries(lftpSettings).map(
      ([key, value]) => `set ${key} ${value}`,
    ),
    `open -u ${user},${password} ${host}`,
    `cat ${file}`,
    'bye',
  ]

  const isWindows = platform() === 'win32'
  const child = isWindows
    ? spawnSync('wsl', ['lftp', '-c', commands.join('; ')], {
        encoding: 'utf-8',
      })
    : spawnSync('lftp', ['-c', commands.join('; ')], { encoding: 'utf-8' })

  if (child.stderr) {
    // 550 means the file doesn't exist, silently return undefined
    if (child.stderr.includes('550')) return undefined
    consola.error(child.stderr)
    return undefined
  }
  return child.stdout
}
