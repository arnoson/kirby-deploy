import {
  any,
  array,
  boolean,
  InferInput,
  literal,
  number,
  object,
  optional,
  record,
  string,
  union,
} from 'valibot'

export const FolderStructureSchema = object({
  content: string(),
  media: string(),
  accounts: string(),
  sessions: string(),
  cache: string(),
  site: string(),
})

export type FolderStructure = InferInput<typeof FolderStructureSchema>

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
  checkComposerLock: optional(boolean()),
  callWebhooks: optional(boolean()),
  dryRun: optional(boolean()),
  verbose: optional(boolean()),
  parallel: optional(number()),
  exclude: optional(array(string())),
  excludeGlob: optional(array(string())),
  include: optional(array(string())),
  includeGlob: optional(array(string())),
  lftpSettings: optional(record(string(), any())),
  lftpFlags: optional(array(string())),
})

export type Config = InferInput<typeof ConfigSchema>

type ConfigWithDefaults = Pick<Config, 'url' | 'token'> &
  Required<Omit<Config, 'url' | 'token'>>

export type ConfigResolved = Omit<ConfigWithDefaults, 'folderStructure'> & {
  folderStructure: FolderStructure
}
