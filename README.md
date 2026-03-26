<p align="center">
  <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./.github/logo-dark.svg">
      <img src="./.github/logo-light.svg" alt="" />
  </picture>
</p>

<h1 align="center">Kirby Deploy</h1>

We have all been there: manually dragging and dropping files into an ftp client like FileZilla to upload our websites to the server. This is not only cumbersome, but also error-prone if you forget to upload some changed files.

There are better tools to automate this process like rsync or lftp, but they are not the easiest to use. Kirby Deploy wraps lftp, provides good defaults and ships you around the edges.

> [!WARNING]  
> This tool is in it's early stages. Use at your own risk and create a backup of your remote/local data before you apply it.

## Demo

![Example](./.github/kirby-deploy-demo.svg)

## Features

- 📡 Uses ftp (no SSH-access required)
- 🌟 Only upload changed files
- 🗂️ Push or pull content to sync your local development
- 🚧 Displays a maintenance note on your website during deployment
- 🧹 Clears the cache after deployment

## Installation

Prerequisites: install [lftp](https://lftp.yar.ru/). If you are using windows, install lftp in WSL (your code doesn't have to be located in WSL).

Install the Kirby plugin

```sh
composer require arnoson/kirby-deploy
```

Install the CLI

```sh
npm install kirby-deploy
```

## Usage

Setup your [config](#config) and deploy your website. All commands will start a dry run giving you an overview of which files would be modified or deleted.

```sh
npx kirby-deploy
```

The content, languages and accounts folder are **not** uploaded, to prevent you from messing up your production website at a later stage. So for the first time deployment you also have to run:

```sh
npx kirby-deploy content-push
npx kirby-deploy accounts-push
npx kirby-deploy languages-push // If you have a multi-language setup
```

See the `/example` for a more detailed setup with `.env` files and npm scripts.

## Config

### Basic

```js
// kirby-deploy.config.js

import { defineConfig } from 'kirby-deploy'
export default defineConfig {
  // Ftp credentials
  host: 'ftp://example.com',
  user: 'user',
  password: '********',

  // If your website is located in a subfolder on your ftp accounts root folder,
  // like `./web/example.com`
  remoteDir: './',

  // The URL to your website
  url: 'https://example.com',

  // Wether or not to check if the `composer.lock` file has changed to speed
  // up deployment.
  checkComposerLock: true,

  // Wether ot not call webhooks to set your website in maintenance mode during
  // deployment and clear the pages cache afterwards.
  callWebhooks: true,
  // A secret token to protect the web hooks.
  token: 'my_secret_token',
}
```

Note: don't hardcode your ftp credentials in the config, use an `.env` file instead. See the `/example` folder.

### Advanced

```js
// kirby-deploy.config.js

import { defineConfig } from 'kirby-deploy'
export default defineConfig {
  // The default folder structure is 'flat' which is Kirby's
  // default structure. But you can also use:
  // - 'public' (https://getkirby.com/docs/guide/configuration/custom-folder-setup#public-and-private-folder-setup) 
  // - 'composer' (https://github.com/getkirby/composerkit)
  folderStructure: 'composer',
  // ...or define a custom structure
  folderStructure: {
    content: 'content',
    media: 'public/media',
    accounts: 'storage/accounts',
    sessions: 'storage/sessions',
    cache: 'storage/cache',
    logs: 'storage/logs',
    site: 'site',
  },

  // Excluding additional files an folders from syncing. Uses lftp's exclude
  // and exclude-glob.
  exclude: ['^my-excluded-folder/'],
  excludeGlob: ['*.ts'],
  // Include files and folders that are matched by the exclude and exclude-glob.
  include: ['^my-included-folder/'],
  includeGlob: ['*-include.ts'],

  // Show additional information, useful for debugging.
  verbose: true,

  // Transfer all files unconditionally, ignoring timestamps and cache. Useful
  // when the remote is in an unknown state and you want to restore it from scratch.
  force: false,

  // Additional lftp settings.
  lftpSettings: { 'ftp:ssl-force': true },

  // Additional lftp flags.
  lftpFlags: ['--no-perms'],
}
```

## Commands

> [!CAUTION]
> `deploy` and all `push` commands will overwrite remote files or delete them if they don't exist locally. Likewise all `pull` commands will overwrite local files or delete them.

### 🚀 Deploy

Upload your website to the server.

```sh
npx kirby-deploy
```

Use `--force` to transfer all files unconditionally, skipping timestamp and cache checks. Useful when the remote is in an unknown state and you want to restore it from scratch.

```sh
npx kirby-deploy --force
```

### 🗂️ Content

#### Push

Upload your local content folder to your website.

```sh
npx kirby-deploy content-push
```

#### Pull

Download the content folder from your website.

```sh
npx kirby-deploy content-pull
```

All content commands also support `--force`:

```sh
npx kirby-deploy content-push --force
npx kirby-deploy content-pull --force
```

### 🔑 Accounts

#### Push

Upload your local accounts folder (including `.htpasswd`) to your website.

```sh
npx kirby-deploy accounts-push
```

#### Pull

Download the accounts folder (including `.htpasswd`) from your website.

```sh
npx kirby-deploy accounts-pull
```

All accounts commands also support `--force`:

```sh
npx kirby-deploy accounts-push --force
npx kirby-deploy accounts-pull --force
```

### 🌍 Languages

#### Push

Upload your local languages folder to your website.

```sh
npx kirby-deploy languages-push
```

#### Pull

Download the languages folder from your website.

```sh
npx kirby-deploy languages-pull
```

All languages commands also support `--force`:

```sh
npx kirby-deploy languages-push --force
npx kirby-deploy languages-pull --force
```

## Troubleshooting

If you can't connect to your ftp server, try connecting with lftp directly to see if this is a general issue with lftp or with this tool.

Try listing e.g. your directory.

```sh
lftp
SET ftp:ssl-force true
open ftp://example.com
user user_name password
ls
```

## Roadmap

- [ ] Allow setting lftp flags in config
- [ ] Better error handling
- [ ] Test `sftp`, right now I only use it for `ftps`

## Credits

Thanks to

- [lftp](https://lftp.yar.ru/)
- [rploy](https://github.com/jongacnik/rploy)
