<p align="center">
  <img src="./.github/kirby-deploy-logo.svg"
 alt="Kirby Deploy" width="135" height="135">
</p>

<h1 align="center">Kirby Deploy</h1>

Automatically upload your Kirby sites to any webspace via ftp.

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

Perquisites: install [lftp](https://lftp.yar.ru/). If you are using windows, install lftp in WSL (your code doesn't have to be located in WSL).

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

The content and accounts folder are **not** uploaded, to prevent you from messing up your production website at a later stage. So for the first time deployment you also have to run:

```sh
npx kirby-deploy content-push
```

and

```sh
npx kirby-deploy accounts-push
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
  // A secret token, can be anything you like.
  token: 'my_secret_token',

  // Wether or not to check if the `composer.lock` file has changed to speed
  // up deployment.
  checkComposerLock: true,

  // Wether ot not call webhooks to set your website in maintenance mode during
  // deployment and clear the pages cache afterwards.
  callWebhooks: true,
}
```

Note: don't hardcode your ftp credentials in the config, use an `.env` file instead. See the `/example` folder.

### Advanced

```js
// kirby-deploy.config.js

import { defineConfig } from 'kirby-deploy'
export default defineConfig {
  // The default folder structure is 'flat' which is Kirby's
  // default structure. If you use a public folder structure use 'public'...
  folderStructure: 'public',
  // ...or define a custom structure
  folderStructure: {
    content: 'content',
    media: 'public/media',
    accounts: 'storage/accounts',
    sessions: 'storage/sessions',
    cache: 'storage/cache',
  },

  // Excluding additional files an folders from syncing. Uses lftp's exclude
  // and exclude-glob.
  exclude: ['^my-excluded-folder/'],
  excludeGlob: ['*.ts'],
  // Include files and folders that are matched by the exclude and exclude-glob.
  include: ['^my-included-folder/'],
  includeGlob: ['*-include.ts'],

  // lftp's --parallel flag.
  parallel: 10,
  // lftp's settings. `ssl-force` is activated by default. Refer to the lftp
  // manual for other settings.
  lftpSettings: {'ftp:ssl-force': true },
  // Show additional information, useful for debugging.
  // Note: this is *not* lftp's --verbose flag, but a flag of this tool to
  // show you mostly lftp related output.
  verbose: true,
}
```

## Commands

### 🚀 Deploy

Upload your website to the server.

Note: this will overwrite remote files and delete remote files that don't exist locally.

```sh
npx kirby-deploy
```

### 🗂️ Content

#### Push

Upload your local content folder to your website.

Note: this will **overwrite** remote files and **delete** any remote files that don't exist locally.

```sh
npx kirby-deploy content-push
```

#### Pull

Download the content folder from your website.

Note: this will **overwrite** local files and **delete** any local files that don't exist on your webspace.

### 🔑 Accounts

#### Push

Upload your local accounts folder (including `.htpasswd`) to your website.

Note: this will **overwrite** remote files and **delete** any remote files that don't exist locally.

```sh
npx kirby-deploy content-push
```

#### Pull

Download the accounts folder (including `.htpasswd`) from your website.

Note: this will _overwrite_ local files and _delete_ any local files that don't exist on your webspace.

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
