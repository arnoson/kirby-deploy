import consola from "consola";
import { colors } from "consola/utils";
import { spawn } from "node:child_process";
import { platform } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline";
import { join } from "path/posix";
import { ConfigResolved } from "./types";
import { upperFirst } from "./utils";

const confirm = (question: string): Promise<boolean> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });
    const formattedQuestion = `\n${colors.green(
      "❯"
    )} ${question} ${colors.yellow("(y/n)")} `;
    rl.question(formattedQuestion, (answer) => {
      rl.close();
      const hasAgreed = ["yes", "y"].includes(answer.toLowerCase());
      resolve(hasAgreed);
    });
  });

type LftpResult = { hasChanges: boolean; hasErrors: boolean };
const runLftp = (commands: string[], verbose: boolean): Promise<LftpResult> => {
  const isWindows = platform() === "win32";
  const child = isWindows
    ? spawn("wsl", ["lftp", "-c", commands.join("; ")])
    : spawn("lftp", ["-c", commands.join("; ")]);

  let hasErrors = false;
  let hasChanges = false;

  const handleData = (data: any) => {
    if (verbose) {
      // const masked = data.toString().replaceAll('/:\/\/.+:.+@/g', '://<user>@<password>')
      const masked = data.toString().replace(/:\/\/.+:.+@/g, '://<user>:<password>@')
      console.log(`${colors.bgBlue(' LFTP ')} ${masked}`)
    }

    data
      .toString()
      .split("\n")
      .forEach((line: string) => {
        let match: RegExpMatchArray | null = null;
        if ((match = line.match(/Transferring file `(.*)'/))) {
          hasChanges = true;
          consola.log(colors.blue(`→ ${match[1]}`));
        } else if (
          (match = line.match(/Removing old (?:file|directory) `(.*)'/))
        ) {
          hasChanges = true;
          consola.log(colors.red(`⨯ ${match[1]}`));
        }
      });
  };

  const handleError = (data: any) => {
    consola.error(data.toString());
    hasErrors = true;
  };

  return new Promise<LftpResult>((resolve) => {
    child.stdout.on("data", handleData);
    child.stderr.on("data", handleError);
    child.on("exit", () => resolve({ hasChanges, hasErrors }));
  });
};

export const sync = async (
  source: string,
  mode: "pull" | "push",
  config: ConfigResolved
): Promise<boolean> => {
  const reverse = mode === "push";
  const targetName = mode === "push" ? "remote" : "local";
  const destination = source === './'
    ? config.remoteDir
    : `./${join(config.remoteDir, source)}`

  const settings = [
    `set ftp:ssl-force true`,
    `set ssl:verify-certificate ${config.verifyCertificate}`,
  ];

  const flags = [
    "--continue",
    "--only-newer",
    "--overwrite",
    "--use-cache",
    "--delete",
    "--verbose",
    `--parallel=${config.parallel}`,
    "--dereference",
    reverse && "--reverse",
    ...config.exclude.map((path: string) => `--exclude ${path}`),
    ...config.excludeGlob.map((path: string) => `--exclude-glob ${path}`),
    ...config.includeGlob.map((path: string) => `--include-glob ${path}`),
    ...config.include.map((path: string) => `--include ${path}`),
  ].filter(Boolean);

  if (config.verbose) {
    const mirror = `mirror ${flags.join(" ")} ${source} ${destination}`;
    const commands = [
      ...settings,
      `open ${config.host}`,
      `user <user> <password>`, // mask credentials
      mirror,
      "bye",
    ];
    consola.log(`\n${colors.bgBlue(" LFTP ")} ${commands.join("; ")}\n`);
  }

  if (config.dryRun) {
    consola.start('Review changes...')
    consola.log('') // empty line

    const flagsJoined = [...flags, "--dry-run"].join(" ");
    const mirror = `mirror ${flagsJoined} ${source} ${destination}`;
    const { hasChanges } = await runLftp([
      ...settings,
      `open ${config.host}`,
      `user ${config.user} ${config.password}`,
      mirror,
      "bye",
    ], config.verbose);

    if (!hasChanges) {
      consola.info(`${upperFirst(targetName)} already up to date`);
      return false;
    }

    const shouldContinue = await confirm(`Apply changes to ${targetName}?`);
    if (!shouldContinue) return false;
    consola.log(""); // empty line
  }

  consola.start('Apply changes...')
  consola.log('') // empty line

  const mirror = `mirror ${flags.join(" ")} ${source} ${destination}`;
  const { hasChanges, hasErrors } = await runLftp([
    ...settings,
    `open ${config.host}`,
    `user ${config.user} ${config.password}`,
    mirror,
    "bye",
  ], config.verbose);

  if (!hasChanges) {
    consola.info(`${upperFirst(targetName)} already up to date`);
    return false;
  }

  consola.log('') // empty line
  consola.success(
    hasErrors ? "All done (but with errors, see output above)!" : "All done!"
  );
  return true
};
