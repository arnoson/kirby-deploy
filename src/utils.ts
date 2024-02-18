import consola from 'consola'
import { exec, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'

export const upperFirst = (string: string) =>
  string.charAt(0).toUpperCase() + string.slice(1)

export const isGit = () => existsSync(join(cwd(), '.git'))

export const getBranch = (): string | undefined => {
  if (!isGit()) return
  const { stderr, stdout } = spawnSync('git', ['branch', '--show-current'], {
    encoding: 'utf-8',
  })
  if (stderr) {
    consola.log(stderr)
    return
  }
  return stdout.trim()
}
