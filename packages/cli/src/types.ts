import {
  Output,
  array,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from 'valibot'

export const FolderStructureSchema = object({
  content: string(),
  media: string(),
  accounts: string(),
  sessions: string(),
  cache: string(),
})

export type FolderStructure = Output<typeof FolderStructureSchema>

export const ConfigSchema = object({
  host: string(),
  user: string(),
  password: string(),
  url: optional(string()),
  token: optional(string()),
  remoteDir: optional(string()),
  folderStructure: optional(
    union([literal('flat'), literal('public'), FolderStructureSchema]),
  ),
  verifyCertificate: optional(boolean()),
  checkComposerLock: optional(boolean()),
  callWebhooks: optional(boolean()),
  dryRun: optional(boolean()),
  verbose: optional(boolean()),
  parallel: optional(number()),
  exclude: optional(array(string())),
  excludeGlob: optional(array(string())),
  include: optional(array(string())),
  includeGlob: optional(array(string())),
})

export type Config = Output<typeof ConfigSchema>

export type ConfigResolved = Required<Omit<Config, 'folderStructure'>> & {
  folderStructure: FolderStructure
}
