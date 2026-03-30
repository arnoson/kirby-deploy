import { spawnSync } from 'child_process'
import { consola } from 'consola'
import { join } from 'path'
import { platform } from 'os'
import { ConfigResolved } from '../types'

export const cat = (
  file: string,
  { host, user, password, remoteDir, lftpSettings }: ConfigResolved,
) => {
  const commands = [
    ...Object.entries(lftpSettings).map(
      ([key, value]) => `set ${key} ${value}`,
    ),
    `open -u ${user},${password} ${host}`,
    `cat ${join(remoteDir, file)}`,
    'bye',
  ]

  const isWindows = platform() === 'win32'
  const child = isWindows
    ? spawnSync('wsl', ['lftp', '-c', commands.join('; ')], {
        encoding: 'utf-8',
      })
    : spawnSync('lftp', ['-c', commands.join('; ')], { encoding: 'utf-8' })

  if (child.stderr) {
    // 550 or "No such file" means the file doesn't exist, silently return undefined
    if (child.stderr.includes('550') || child.stderr.includes('No such file'))
      return undefined
    consola.error(child.stderr)
    return undefined
  }
  return child.stdout
}
