import { Context } from 'hono'
import { Env } from '../lib/types'

export async function healthHandler(ctx: Context<{ Bindings: Env }>) {
  return ctx.json({
    status: 'ok',
    timestamp: Date.now(),
  })
}
