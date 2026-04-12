import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'

type ApiRequest = IncomingMessage & { body?: unknown }

type ApiResponse = {
  status: (statusCode: number) => ApiResponse
  setHeader: (name: string, value: string | string[]) => ApiResponse
  send: (body: string) => void
}

async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = []

  for await (const chunk of req) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk))
    } else {
      chunks.push(chunk)
    }
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}

function createResponseAdapter(res: ServerResponse): ApiResponse {
  return {
    status(statusCode: number) {
      res.statusCode = statusCode
      return this
    },
    setHeader(name: string, value: string | string[]) {
      res.setHeader(name, value)
      return this
    },
    send(body: string) {
      res.end(body)
    }
  }
}

async function loadRegisterHandler() {
  const apiRoutePath = path.resolve(__dirname, '../api/register.js')
  const moduleUrl = `${pathToFileURL(apiRoutePath).href}?t=${Date.now()}`
  const module = await import(moduleUrl)

  return module.default as (req: ApiRequest, res: ApiResponse) => Promise<void> | void
}

function localApiPlugin(): Plugin {
  return {
    name: 'local-register-api',
    configureServer(server) {
      server.middlewares.use('/api/register', async (req, res) => {
        if (!req.url || req.url === '/') {
          if (req.method === 'POST') {
            try {
              ;(req as ApiRequest).body = await readRequestBody(req)
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON payload.' }))
              return
            }
          }

          try {
            const handler = await loadRegisterHandler()
            await handler(req as ApiRequest, createResponseAdapter(res))
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected server error.'
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to process request.', detail: message }))
          }
          return
        }

        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Not Found' }))
      })
    }
  }
}

function mergeIntoProcessEnv(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

export default defineConfig(({ mode }) => {
  const frontendEnv = loadEnv(mode, __dirname, '')
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  mergeIntoProcessEnv(rootEnv)
  mergeIntoProcessEnv(frontendEnv)

  return {
    plugins: [localApiPlugin()]
  }
})