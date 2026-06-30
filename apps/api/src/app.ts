import cors from '@fastify/cors'
import Fastify from 'fastify'

import { authRoutes } from './routes/auth.js'
import { catalogRoutes } from './routes/catalog.js'
import { customerRoutes } from './routes/customer.js'
import { riderRoutes } from './routes/rider.js'
import { salesAgentRoutes } from './routes/sales-agent.js'
import { routePayRoutes } from './routes/routepay.js'
import { uploadRoutes } from './routes/uploads.js'

type BuildAppOptions = {
  logger?: boolean
  webOrigin?: string
}

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  })

  const allowedOrigins = getAllowedOrigins(options.webOrigin)

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true)
        return
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`), false)
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  app.register(authRoutes, { prefix: '/auth' })
  app.register(customerRoutes, { prefix: '/customer' })
  app.register(catalogRoutes, { prefix: '/customer' })
  app.register(routePayRoutes, { prefix: '/customer' })
  app.register(riderRoutes, { prefix: '/rider' })
  app.register(salesAgentRoutes, { prefix: '/sales-agent' })
  app.register(uploadRoutes, { prefix: '/uploads' })

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'mando-api',
      timestamp: new Date().toISOString(),
    }
  })

  app.get('/', async () => {
    return {
      name: 'Mando API',
      status: 'running',
    }
  })

  return app
}

function getAllowedOrigins(webOrigin: string | undefined) {
  if (!webOrigin) return defaultAllowedOrigins

  const configuredOrigins = webOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return Array.from(new Set([...configuredOrigins, ...defaultAllowedOrigins]))
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  if (allowedOrigins.includes(origin)) return true

  if (process.env.NODE_ENV === 'production') return false

  try {
    const url = new URL(origin)

    return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}
