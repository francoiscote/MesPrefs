import { SpotifyTrack, CurrentlyPlayingResponse, SpotifyTokenResponse, PlaylistTracksResponse } from './types'

async function fetchAccessToken(env: Env): Promise<string> {
  const clientId = env.SPOTIFY_CLIENT_ID
  const clientSecret = env.SPOTIFY_CLIENT_SECRET

  const auth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error(`Access Token request failed: ${response.status}`)
  }

  const data = (await response.json()) as SpotifyTokenResponse
  env.MESPREFS?.put("spotify_accessToken", data.access_token)
  env.MESPREFS?.put("spotify_refreshToken", data.refresh_token)
  
  const expiry = Date.now() + data.expires_in * 1000
  env.MESPREFS?.put("spotify_accessToken_expiry", expiry.toString(10));
  return data.access_token
}

async function getAccessToken(env: Env): Promise<string> {
  const cachedAccessToken = await env.MESPREFS?.get('spotify_accessToken')
  const cachedTokenExpiry = await env.MESPREFS?.get('spotify_accessToken_expiry')

  if (!cachedAccessToken || !cachedTokenExpiry) {
    return fetchAccessToken(env)
  }
  
  const expires_in = Number(cachedTokenExpiry) - Date.now()
  
  if (expires_in < 1000 * 60 * 5) {
    return fetchAccessToken(env)
  }

  return cachedAccessToken
}

async function spotifyFetch(
  url: string,
  options: RequestInit,
  env: Env
): Promise<Response> {
  const token = await getAccessToken(env)
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)

  console.log("url", url)
  console.log("token", token)
  
  let response = await fetch(url, { ...options, headers })

  return response
}

export async function getCurrentlyPlaying(env: Env): Promise<SpotifyTrack | null> {
  const response = await spotifyFetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    { method: 'GET' },
    env
  )

  if (!response.ok) {
    throw new Error(`getCurrentlyPlaying failed: ${response.status}`)
  }

  const data = (await response.json()) as CurrentlyPlayingResponse

  if (!data.item || !data.item.uri) {
    return null
  }

  return {
    uri: data.item.uri,
    name: data.item.name || 'Unknown',
    artists: data.item.artists || [],
  }
}

export async function checkTrackInPlaylist(
  trackUri: string,
  env: Env
): Promise<boolean> {
  const playlistId = env.SPOTIFY_PLAYLIST_ID
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`

  while (url) {
    const response = await spotifyFetch(url, { method: 'GET' }, env)

    if (!response.ok) {
      throw new Error(`checkTrackInPlaylist failed: ${response.status}`)
    }

    const data = (await response.json()) as PlaylistTracksResponse

    for (const item of data.items) {
      if (item.track.uri === trackUri) {
        return true
      }
    }

    url = data.next || ''
  }

  return false
}

export async function addTrackToPlaylist(trackUri: string, env: Env): Promise<void> {
  const playlistId = env.SPOTIFY_PLAYLIST_ID

  const response = await spotifyFetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    },
    env
  )

  if (!response.ok) {
    throw new Error(`addTrackToPlaylist failed: ${response.status}`)
  }
}

export async function removeTrackFromPlaylist(trackUri: string, env: Env): Promise<void> {
  const playlistId = env.SPOTIFY_PLAYLIST_ID

  const response = await spotifyFetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
    },
    env
  )

  if (!response.ok) {
    throw new Error(`removeTrackFromPlaylist failed: ${response.status}`)
  }
}
