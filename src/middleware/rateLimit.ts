import { Context, Next } from 'hono'
import { Env } from '../lib/types'

interface RateLimitBucket {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitBucket>()
const LIMIT_PER_MINUTE = 60
const MINUTE_MS = 60000

function hashToken(token: string): string {
  let hash = 0
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export async function rateLimit(ctx: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = ctx.req.header('Authorization')

  if (!authHeader) {
    return ctx.json({ error: 'Too Many Requests' }, 429)
  }

  const token = authHeader.slice(7)
  const tokenHash = hashToken(token)
  const now = Date.now()

  let bucket = rateLimitMap.get(tokenHash)

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + MINUTE_MS }
    rateLimitMap.set(tokenHash, bucket)
  }

  bucket.count++

  if (bucket.count > LIMIT_PER_MINUTE) {
    return ctx.json({ error: 'Too Many Requests' }, 429)
  }

  await next()
}
