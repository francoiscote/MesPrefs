import { Context } from 'hono'
import { Env } from '../lib/types'
import { getCurrentlyPlaying, checkTrackInPlaylist, addTrackToPlaylist } from '../lib/spotify'

export async function addHandler(ctx: Context<{ Bindings: Env }>) {
  try {
    const track = await getCurrentlyPlaying(ctx.env)

    if (!track) {
      return ctx.json({ error: 'No track currently playing' }, 400)
    }

    const inPlaylist = await checkTrackInPlaylist(track.uri, ctx.env)

    if (inPlaylist) {
      return ctx.json({ error: 'Track already in playlist' }, 409)
    }

    await addTrackToPlaylist(track.uri, ctx.env)

    return ctx.json({
      success: true,
      track,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('addHandler error:', message)
    return ctx.json({ error: 'Spotify API error' }, 502)
  }
}
