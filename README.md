# mesprefs - Spotify Playlist Manager

My son always askes to add/remove the currently playing track to/from his Spotify playlist. I decided to automate this process and it started with this simple API. It runs on a Cloudflare Workers using Hono . 

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure Spotify credentials:**
   - Create a Spotify app at https://developer.spotify.com/dashboard
   - Get `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
   - Perform OAuth flow to get `SPOTIFY_REFRESH_TOKEN` (scopes: `user-read-currently-playing`, `playlist-modify-public`, `playlist-modify-private`)
   - Get your target playlist ID from Spotify

3. **Set local environment variables** in `.dev.vars`:
   ```
   BEARER_TOKEN=your_bearer_token_here
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token
   SPOTIFY_PLAYLIST_ID=your_spotify_playlist_id
   ```

4. **Update wrangler.toml** with your playlist ID and configure production settings as needed.

## Development

```bash
pnpm run dev
```

Server runs on `http://localhost:8787`

## Routes

**Public:**
- `GET /health` - Health check, returns `{ status: "ok", timestamp }`

**Protected** (require `Authorization: Bearer <token>` header):
- `GET /current` - Get currently playing track
- `GET /playlists` - Get all your playlists, useful to get the playlist ID
- `POST /add` - Add currently playing track to playlist
- `POST /remove` - Remove currently playing track from playlist

**Rate limiting:** 60 requests/minute per token (429 if exceeded)

## Deployment

1. **Set production secrets:**
   ```bash
   pnpx wrangler secret put BEARER_TOKEN
   pnpx wrangler secret put SPOTIFY_CLIENT_ID
   pnpx wrangler secret put SPOTIFY_CLIENT_SECRET
   pnpx wrangler secret put SPOTIFY_REFRESH_TOKEN
   ```

2. **Deploy:**
   ```bash
   pnpm run deploy
   ```

## Error Responses

- `400` - No track currently playing or validation error
- `401` - Missing/invalid Bearer token
- `404` - Playlist not found
- `409` - Track already in playlist (add endpoint)
- `429` - Rate limit exceeded
- `502` - Spotify API error
