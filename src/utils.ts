import consola from 'consola'
import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'

export const upperFirst = (string: string) =>
  string.charAt(0).toUpperCase() + string.slice(1)

export const isGit = () => existsSync(join(cwd(), '.git'))

export const getBranch = () =>
  new Promise<string | undefined>((resolve, reject) => {
    if (!isGit()) resolve(undefined)
    exec('git branch --show-current', (error, stdout, stderr) => {
      if (error) return reject(error.message)
      if (stderr) return consola.error(stderr)
      resolve(stdout.trim())
    })
  })
