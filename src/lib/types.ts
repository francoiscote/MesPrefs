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
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface PlaylistTracksResponse {
  items: Array<{
    track: SpotifyItem
  }>
  next?: string
}