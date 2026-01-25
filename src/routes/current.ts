import { Context } from 'hono'
import { Env } from '../lib/types'
import { getCurrentlyPlaying } from '../lib/spotify'

export async function currentHandler(ctx: Context<{ Bindings: Env }>) {
  try {
    const track = await getCurrentlyPlaying(ctx.env)

    return ctx.json({
      track,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('currentHandler error:', message)
    return ctx.json({ error: 'Spotify API error' }, 502)
  }
}
