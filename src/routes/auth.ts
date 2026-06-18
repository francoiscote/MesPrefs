import { Context } from 'hono'
import { createSignedState, verifySignedState } from '../lib/crypto'

const SCOPES = [
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private',
].join(' ')

export async function loginHandler(c: Context<{ Bindings: Env }>) {
  const state = await createSignedState(c.env.SPOTIFY_CLIENT_SECRET)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: c.env.SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: c.env.SPOTIFY_REDIRECT_URI,
    state,
  })
  console.log("Open in Browser", `https://accounts.spotify.com/authorize?${params}`)
  return c.redirect(`https://accounts.spotify.com/authorize?${params}`)
}

export async function callbackHandler(c: Context<{ Bindings: Env }>) {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')

  if (error) {
    return c.text(`Auth error: ${error}`, 400)
  }

  if (!state || !await verifySignedState(state, c.env.SPOTIFY_CLIENT_SECRET)) {
    return c.text('Invalid or expired state', 400)
  }

  if (!code) {
    return c.text('Missing code', 400)
  }

  const auth = btoa(`${c.env.SPOTIFY_CLIENT_ID}:${c.env.SPOTIFY_CLIENT_SECRET}`)

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.env.SPOTIFY_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return c.text(`Token exchange failed: ${text}`, 500)
  }

  const data = await response.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // Store tokens in KV
  await c.env.MESPREFS?.put('spotify_accessToken', data.access_token)
  await c.env.MESPREFS?.put('spotify_refreshToken', data.refresh_token)
  const expiry = Date.now() + data.expires_in * 1000
  await c.env.MESPREFS?.put('spotify_accessToken_expiry', expiry.toString(10))
  // Refresh tokens expire 6 months after authorization (Spotify 2026-06-18).
  // The token carries no issuance date, so record it here. Only re-authorization
  // resets this clock — refreshing the access token does not extend it.
  await c.env.MESPREFS?.put('spotify_refreshToken_issuedAt', Date.now().toString(10))

  return c.text('Auth successful. Tokens stored.')
}
