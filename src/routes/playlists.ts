import { Context } from 'hono'
import { getPlaylists } from '../lib/spotify'

export async function playlistsHandler(ctx: Context<{ Bindings: Env }>) {
  try {
    const playlists = await getPlaylists(ctx.env)

    return ctx.json({
      playlists,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('playlistsHandler error:', message)
    return ctx.json({ error: 'Spotify API error' }, 502)
  }
}
