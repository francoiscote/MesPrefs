export interface Env {
  BEARER_TOKEN: string
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
  SPOTIFY_REFRESH_TOKEN: string
  SPOTIFY_PLAYLIST_ID: string
}

export interface SpotifyArtist {
  name: string
}

export interface SpotifyTrack {
  uri: string
  name: string
  artists: SpotifyArtist[]
}

export interface SpotifyItem {
  uri?: string
  name?: string
  artists?: SpotifyArtist[]
}

export interface CurrentlyPlayingResponse {
  item: SpotifyItem | null
  is_playing: boolean
}

export interface SpotifyTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

export interface PlaylistTracksResponse {
  items: Array<{
    track: SpotifyItem
  }>
  next?: string
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'error'
  route: string
  method: string
  status?: number
  duration: number
  error?: string
}
