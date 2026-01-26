import { SpotifyTrack, CurrentlyPlayingResponse, SpotifyTokenResponse, PlaylistTracksResponse, PlaylistsResponse } from './types'

async function fetchAccessToken(env: Env): Promise<string> {
  // Get refresh token from KV first, fallback to env var
  const refreshToken = await env.MESPREFS?.get('spotify_refreshToken') || env.SPOTIFY_REFRESH_TOKEN

  if (!refreshToken) {
    throw new Error('No refresh token available. Complete OAuth flow at /auth/login')
  }

  const auth = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Access Token request failed: ${response.status}`)
  }

  const data = (await response.json()) as SpotifyTokenResponse
  await env.MESPREFS?.put('spotify_accessToken', data.access_token)

  // Handle token rotation - Spotify may return new refresh token
  if (data.refresh_token) {
    await env.MESPREFS?.put('spotify_refreshToken', data.refresh_token)
  }

  const expiry = Date.now() + data.expires_in * 1000
  await env.MESPREFS?.put('spotify_accessToken_expiry', expiry.toString(10))
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

  // 204 = nothing playing
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

export async function getPlaylists(env: Env): Promise<SpotifyPlaylists | null> {
  const response = await spotifyFetch(
    'https://api.spotify.com/v1/me/playlists',
    { method: 'GET' },
    env
  )

  // 204 = nothing playing
  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    throw new Error(`getPlaylists failed: ${response.status}`)
  }

  const data = (await response.json()) as PlaylistsResponse

  if (data.total == 0) {
    return null
  }

  return data
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

export async function startPlayback(env: Env): Promise<void> {
  const playlistId = env.SPOTIFY_PLAYLIST_ID

  const response = await spotifyFetch(
    'https://api.spotify.com/v1/me/player/play',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
    },
    env
  )

  if (!response.ok) {
    throw new Error(`startPlayback failed: ${response.status}`)
  }
}
