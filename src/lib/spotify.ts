import { Env, SpotifyTrack, CurrentlyPlayingResponse, SpotifyTokenResponse, PlaylistTracksResponse } from './types'

let cachedAccessToken = ''
let cachedTokenExpiry = 0

async function refreshAccessToken(env: Env): Promise<string> {
  const clientId = env.SPOTIFY_CLIENT_ID
  const clientSecret = env.SPOTIFY_CLIENT_SECRET
  const refreshToken = env.SPOTIFY_REFRESH_TOKEN

  const auth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data = (await response.json()) as SpotifyTokenResponse
  cachedAccessToken = data.access_token
  cachedTokenExpiry = Date.now() + data.expires_in * 1000
  return cachedAccessToken
}

async function getAccessToken(env: Env): Promise<string> {
  if (cachedAccessToken && cachedTokenExpiry > Date.now()) {
    return cachedAccessToken
  }
  return refreshAccessToken(env)
}

async function spotifyFetch(
  url: string,
  options: RequestInit,
  env: Env
): Promise<Response> {
  const token = await getAccessToken(env)
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)

  let response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    const newToken = await refreshAccessToken(env)
    const newHeaders = new Headers(options.headers || {})
    newHeaders.set('Authorization', `Bearer ${newToken}`)
    response = await fetch(url, { ...options, headers: newHeaders })
  }

  return response
}

export async function getCurrentlyPlaying(env: Env): Promise<SpotifyTrack | null> {
  const response = await spotifyFetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    { method: 'GET' },
    env
  )

  if (response.status === 204) {
    return null
  }

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
