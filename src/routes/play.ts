import { Context } from 'hono'
import { startPlayback } from '../lib/spotify'

export async function playHandler(ctx: Context<{ Bindings: Env }>) {
  try {
    await startPlayback(ctx.env)
    return ctx.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('playHandler error:', message)
    return ctx.json({ error: 'Spotify API error' }, 502)
  }
}
