import { serve } from '@hono/node-server'
import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createFileStore } from './store-file.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(rootDir, '.env') })

const fileStore = createFileStore()
const app = createApp(() => fileStore)

const port = Number(process.env.PORT ?? 4000)
console.log(`API rodando em http://localhost:${port}`)
serve({ fetch: app.fetch, port })
