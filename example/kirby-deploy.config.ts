import { defineConfig } from '../src'

export default defineConfig({
  host: process.env.FTP_HOST!,
  user: process.env.FTP_USER!,
  password: process.env.FTP_PASSWORD!,
  verbose: true
})