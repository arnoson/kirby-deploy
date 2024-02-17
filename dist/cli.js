// src/cli.ts
import { runMain } from "citty";

// src/commands/main.ts
import { defineCommand as defineCommand3 } from "citty";
import { relative } from "path/posix";
import { cwd } from "process";

// src/config.ts
import { loadConfig as load } from "c12";
import consola from "consola";
import { flatten, parse } from "valibot";

// src/types.ts
import {
  array,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union
} from "valibot";
var FolderStructureSchema = object({
  content: string(),
  media: string(),
  accounts: string(),
  sessions: string(),
  cache: string()
});
var ConfigSchema = object({
  host: string(),
  user: string(),
  password: string(),
  remoteDir: optional(string()),
  folderStructure: optional(
    union([
      literal("flat"),
      literal("public"),
      FolderStructureSchema
    ])
  ),
  verifyCertificate: optional(boolean()),
  dryRun: optional(boolean()),
  verbose: optional(boolean()),
  parallel: optional(number()),
  exclude: optional(array(string())),
  excludeGlob: optional(array(string())),
  include: optional(array(string())),
  includeGlob: optional(array(string()))
});

// src/config.ts
var loadConfig = async () => {
  let { config, configFile } = await load({
    name: "kirby-deploy",
    dotenv: true
  });
  if (!config) {
    consola.error(new Error("no config file found"));
    return null;
  }
  try {
    parse(ConfigSchema, config);
  } catch (e) {
    const issues = flatten(e).nested;
    const info = Object.entries(issues).map(([key, messages]) => `  - ${key} (${messages.join(", ")})`).join("\n");
    consola.error(`Invalid properties in ${configFile}
${info}`);
    return null;
  }
  if (config.folderStructure === "flat") {
    config.folderStructure = {
      content: "content",
      media: "site/media",
      accounts: "site/accounts",
      sessions: "site/sessions",
      cache: "site/cache"
    };
  } else {
    config.folderStructure = {
      content: "content",
      media: "public/media",
      accounts: "storage/accounts",
      sessions: "storage/sessions",
      cache: "storage/cache"
    };
  }
  config = {
    remoteDir: "./",
    dryRun: true,
    parallel: 10,
    verifyCertificate: true,
    exclude: [],
    excludeGlob: [],
    include: [],
    includeGlob: [],
    ...config
  };
  return config;
};

// src/sync.ts
import consola2 from "consola";
import { colors } from "consola/utils";
import { spawn } from "node:child_process";
import { platform } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline";
import { join } from "path/posix";

// src/utils.ts
var upperFirst = (string2) => string2.charAt(0).toUpperCase() + string2.slice(1);

// src/sync.ts
var confirm = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input, output });
  const formattedQuestion = `
${colors.green(
    "\u276F"
  )} ${question} ${colors.yellow("(y/n)")} `;
  rl.question(formattedQuestion, (answer) => {
    rl.close();
    const hasAgreed = ["yes", "y"].includes(answer.toLowerCase());
    resolve(hasAgreed);
  });
});
var runLftp = (commands, verbose) => {
  const isWindows = platform() === "win32";
  const child = isWindows ? spawn("wsl", ["lftp", "-c", commands.join("; ")]) : spawn("lftp", ["-c", commands.join("; ")]);
  let hasErrors = false;
  let hasChanges = false;
  const handleData = (data) => {
    if (verbose) {
      const masked = data.toString().replace(/:\/\/.+:.+@/g, "://<user>:<password>@");
      console.log(`${colors.bgBlue(" LFTP ")} ${masked}`);
    }
    data.toString().split("\n").forEach((line) => {
      let match = null;
      if (match = line.match(/Transferring file `(.*)'/)) {
        hasChanges = true;
        consola2.log(colors.blue(`\u2192 ${match[1]}`));
      } else if (match = line.match(/Removing old (?:file|directory) `(.*)'/)) {
        hasChanges = true;
        consola2.log(colors.red(`\u2A2F ${match[1]}`));
      }
    });
  };
  const handleError = (data) => {
    consola2.error(data.toString());
    hasErrors = true;
  };
  return new Promise((resolve) => {
    child.stdout.on("data", handleData);
    child.stderr.on("data", handleError);
    child.on("exit", () => resolve({ hasChanges, hasErrors }));
  });
};
var sync = async (source, mode, config) => {
  const reverse = mode === "push";
  const targetName = mode === "push" ? "remote" : "local";
  const destination = source === "./" ? config.remoteDir : `./${join(config.remoteDir, source)}`;
  const settings = [
    `set ftp:ssl-force true`,
    `set ssl:verify-certificate ${config.verifyCertificate}`
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
    ...config.exclude.map((path) => `--exclude ${path}`),
    ...config.excludeGlob.map((path) => `--exclude-glob ${path}`),
    ...config.includeGlob.map((path) => `--include-glob ${path}`),
    ...config.include.map((path) => `--include ${path}`)
  ].filter(Boolean);
  if (config.verbose) {
    const mirror2 = `mirror ${flags.join(" ")} ${source} ${destination}`;
    const commands = [
      ...settings,
      `open ${config.host}`,
      `user <user> <password>`,
      // mask credentials
      mirror2,
      "bye"
    ];
    consola2.log(`
${colors.bgBlue(" LFTP ")} ${commands.join("; ")}
`);
  }
  if (config.dryRun) {
    consola2.start("Review changes...");
    consola2.log("");
    const flagsJoined = [...flags, "--dry-run"].join(" ");
    const mirror2 = `mirror ${flagsJoined} ${source} ${destination}`;
    const { hasChanges: hasChanges2 } = await runLftp([
      ...settings,
      `open ${config.host}`,
      `user ${config.user} ${config.password}`,
      mirror2,
      "bye"
    ], config.verbose);
    if (!hasChanges2) {
      consola2.info(`${upperFirst(targetName)} already up to date`);
      return false;
    }
    const shouldContinue = await confirm(`Apply changes to ${targetName}?`);
    if (!shouldContinue)
      return false;
    consola2.log("");
  }
  consola2.start("Apply changes...");
  consola2.log("");
  const mirror = `mirror ${flags.join(" ")} ${source} ${destination}`;
  const { hasChanges, hasErrors } = await runLftp([
    ...settings,
    `open ${config.host}`,
    `user ${config.user} ${config.password}`,
    mirror,
    "bye"
  ], config.verbose);
  if (!hasChanges) {
    consola2.info(`${upperFirst(targetName)} already up to date`);
    return false;
  }
  consola2.log("");
  consola2.success(
    hasErrors ? "All done (but with errors, see output above)!" : "All done!"
  );
  return true;
};

// src/commands/accounts.ts
import { defineCommand } from "citty";
var syncAccounts = async (mode) => {
  const config = await loadConfig();
  if (!config)
    return;
  const { accounts } = config.folderStructure;
  const source = `./${accounts}/`;
  return sync(source, mode, {
    ...config,
    // User provided includes/excludes can only be used in the main command
    // because they are relative to the base directory, so we reset them.
    exclude: [],
    excludeGlob: [".*", ".*/"],
    include: [".htpasswd"],
    // Make sure account passwords are synced.
    includeGlob: []
  });
};
var accountsPush = defineCommand({ run: () => syncAccounts("push") });
var accountsPull = defineCommand({ run: () => syncAccounts("pull") });

// src/commands/content.ts
import { defineCommand as defineCommand2 } from "citty";
var syncContent = async (mode) => {
  const config = await loadConfig();
  if (!config)
    return;
  const { content } = config.folderStructure;
  const source = `./${content}/`;
  return sync(source, mode, {
    ...config,
    // User provided includes/excludes can only be used in the main command
    // because they are relative to the base directory, so we reset them.
    exclude: [],
    excludeGlob: [".*", ".*/"],
    include: [],
    includeGlob: []
  });
};
var contentPush = defineCommand2({ run: () => syncContent("push") });
var contentPull = defineCommand2({ run: () => syncContent("push") });

// src/commands/main.ts
var main = defineCommand3({
  run: async ({ rawArgs, cmd }) => {
    const [firstArg] = rawArgs;
    const subCommands = Object.keys(cmd.subCommands ?? {});
    const isSubCommand = subCommands.includes(firstArg);
    if (isSubCommand)
      return;
    const config = await loadConfig();
    if (!config)
      return;
    const { folderStructure } = config;
    const exclude = [
      ...config.exclude,
      "^node_modules/",
      `^${relative(cwd(), folderStructure.content)}`,
      `^${relative(cwd(), folderStructure.media)}`,
      `^${relative(cwd(), folderStructure.accounts)}`,
      `^${relative(cwd(), folderStructure.sessions)}`,
      `^${relative(cwd(), folderStructure.cache)}`
    ];
    const excludeGlob = [...config.excludeGlob, ".*", ".*/"];
    const include = config.include;
    const includeGlob = [...config.includeGlob, ".htaccess"];
    sync("./", "push", {
      ...config,
      exclude,
      excludeGlob,
      include,
      includeGlob
    });
  },
  subCommands: {
    ["content-push"]: contentPush,
    ["content-pull"]: contentPull,
    ["accounts-push"]: accountsPush,
    ["accounts-pull"]: accountsPull
  }
});

// src/cli.ts
runMain(main);
