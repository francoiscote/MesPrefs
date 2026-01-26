import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { bearerAuth } from './middleware/auth'
import { rateLimit } from './middleware/rateLimit'
import { healthHandler } from './routes/health'
import { currentHandler } from './routes/current'
import { playlistsHandler } from './routes/playlists'
import { addHandler } from './routes/add'
import { removeHandler } from './routes/remove'
import { loginHandler, callbackHandler } from './routes/auth'

const app = new Hono<{ Bindings: Env }>()
app.use(logger())

// Public routes
app.get('/health', healthHandler)
app.get('/auth/callback', callbackHandler)

// Protected routes
const protected_ = new Hono<{ Bindings: Env }>()
protected_.use('*', bearerAuth, rateLimit)
protected_.get('/current', currentHandler)
protected_.get('/playlists', playlistsHandler)
protected_.post('/add', addHandler)
protected_.post('/remove', removeHandler)
protected_.get('/auth/login', loginHandler)

app.route('/', protected_)

// 404 handler
app.notFound(() => new Response('Not Found', { status: 404 }))

export default app
