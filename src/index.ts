import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { bearerAuth } from './middleware/auth'
import { rateLimit } from './middleware/rateLimit'
import { healthHandler } from './routes/health'
import { currentHandler } from './routes/current'
import { addHandler } from './routes/add'
import { removeHandler } from './routes/remove'

const app = new Hono<{ Bindings: Env }>()
app.use(logger())

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
