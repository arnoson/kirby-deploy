import { defineConfig } from 'kirby-deploy'

export default defineConfig({
  host: process.env.FTP_HOST!,
  user: process.env.FTP_USER!,
  password: process.env.FTP_PASSWORD!,
  url: process.env.URL,
  token: process.env.TOKEN,
})
