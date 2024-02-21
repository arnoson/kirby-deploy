import consola from 'consola'
import { colors } from 'consola/utils'
import { spawn } from 'node:child_process'
import { platform } from 'node:os'
import { ConfigResolved } from '../types'

interface Result {
  hasChanges: boolean
  hasErrors: boolean
}

export const mirror = (
  source: string,
  destination: string,
  flags: string[],
  { lftpSettings, host, user, password }: ConfigResolved,
): Promise<Result> => {
  const commands = [
    ...Object.entries(lftpSettings).map(
      ([key, value]) => `set ${key} ${value}`,
    ),
    `open ${host}`,
    `user ${user} ${password}`, // mask credentials
    `mirror ${flags.join(' ')} ${source} ${destination}`,
    'bye',
  ]
  const isWindows = platform() === 'win32'
  const child = isWindows
    ? spawn('wsl', ['lftp', '-c', commands.join('; ')])
    : spawn('lftp', ['-c', commands.join('; ')])

  let hasErrors = false
  let hasChanges = false

  const handleData = (data: any) => {
    data
      .toString()
      .split('\n')
      .forEach((line: string) => {
        let match: RegExpMatchArray | null = null
        if ((match = line.match(/Transferring file `(.*)'/))) {
          hasChanges = true
          consola.log(colors.blue(`→ ${match[1]}`))
        } else if (
          (match = line.match(/Removing old (?:file|directory) `(.*)'/))
        ) {
          hasChanges = true
          consola.log(colors.red(`⨯ ${match[1]}`))
        }
      })
  }

  const handleError = (data: any) => {
    consola.error(data.toString())
    hasErrors = true
  }

  return new Promise<Result>((resolve) => {
    child.stdout.on('data', handleData)
    child.stderr.on('data', handleError)
    child.on('exit', () => resolve({ hasChanges, hasErrors }))
  })
}

export const logMirror = (
  source: string,
  destination: string,
  flags: string[],
  { lftpSettings, host }: ConfigResolved,
) => {
  const commands = [
    ...Object.entries(lftpSettings).map(
      ([key, value]) => `set ${key} ${value}`,
    ),
    `open ${host}`,
    `user <user> <password>`, // mask credentials
    `mirror ${flags.join(' ')} ${source} ${destination}`,
    'bye',
  ]
  consola.log(`\n${colors.bgBlue(' LFTP ')} ${commands.join('; ')}\n`)
}
