import { Hono } from 'hono'
import { Env } from './lib/types'
import { log } from './lib/logger'
import { bearerAuth } from './middleware/auth'
import { rateLimit } from './middleware/rateLimit'
import { healthHandler } from './routes/health'
import { currentHandler } from './routes/current'
import { addHandler } from './routes/add'
import { removeHandler } from './routes/remove'

const app = new Hono<{ Bindings: Env }>()

// Logging middleware (all routes)
app.use('*', async (ctx, next) => {
  const startTime = Date.now()
  const route = ctx.req.path
  const method = ctx.req.method

  try {
    await next()
    const duration = Date.now() - startTime
    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      route,
      method,
      status: ctx.res.status,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'
    log({
      timestamp: new Date().toISOString(),
      level: 'error',
      route,
      method,
      duration,
      error: message,
    })
    throw error
  }
})

// Public routes
app.get('/health', healthHandler)

// Protected routes
const protected_ = new Hono<{ Bindings: Env }>()
protected_.use('*', bearerAuth, rateLimit)
protected_.get('/current', currentHandler)
protected_.post('/add', addHandler)
protected_.post('/remove', removeHandler)

app.route('/', protected_)

// 404 handler
app.notFound(() => new Response('Not Found', { status: 404 }))

export default app
