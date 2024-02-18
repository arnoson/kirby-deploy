import consola from 'consola'
import { colors } from 'consola/utils'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { cwd, stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline'

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

export const confirm = (question: string): Promise<boolean> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input, output })
    const formattedQuestion = `\n${question} ${colors.yellow('(y/n)')} `
    rl.question(formattedQuestion, (answer) => {
      rl.close()
      const hasAgreed = ['yes', 'y'].includes(answer.toLowerCase())
      resolve(hasAgreed)
    })
  })

export const callWebhook = async (
  url: string,
  token: string,
): Promise<boolean> => {
  const result = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (result.status < 200 || result.status >= 300) {
    consola.error(`Failed to call webhook ${url}, status: ${result.status}`)
    return false
  }

  return true
}
