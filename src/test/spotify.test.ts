import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentlyPlaying,
  checkTrackInPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  startPlayback,
} from '../lib/spotify'
import { Env } from '../lib/types'

const mockEnv: Env = {
  BEARER_TOKEN: 'test-token',
  SPOTIFY_CLIENT_ID: 'test-client-id',
  SPOTIFY_CLIENT_SECRET: 'test-secret',
  SPOTIFY_REFRESH_TOKEN: 'test-refresh-token',
  SPOTIFY_PLAYLIST_ID: 'test-playlist-id',
}

describe('Spotify service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentlyPlaying', () => {
    it('returns track when item exists', async () => {
      const mockTrack = {
        uri: 'spotify:track:123',
        name: 'Test Track',
        artists: [{ name: 'Test Artist' }],
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            item: mockTrack,
            is_playing: true,
          }),
        })

      const result = await getCurrentlyPlaying(mockEnv)

      expect(result).toEqual(mockTrack)
    })

    it('returns null when status 204', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 204,
        })

      const result = await getCurrentlyPlaying(mockEnv)
      expect(result).toBeNull()
    })

    it('returns null when item is null', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ item: null, is_playing: false }),
        })

      const result = await getCurrentlyPlaying(mockEnv)
      expect(result).toBeNull()
    })

    it('returns null when item missing uri', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            item: { name: 'Track', artists: [] },
            is_playing: true,
          }),
        })

      const result = await getCurrentlyPlaying(mockEnv)
      expect(result).toBeNull()
    })
  })


  describe('checkTrackInPlaylist', () => {
    it('returns true when track found on first page', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { track: { uri: 'spotify:track:123' } },
              { track: { uri: 'spotify:track:456' } },
            ],
            next: null,
          }),
        })

      const result = await checkTrackInPlaylist('spotify:track:123', mockEnv)
      expect(result).toBe(true)
    })

    it('returns true when track found on subsequent page', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{ track: { uri: 'spotify:track:other' } }],
            next: 'https://api.spotify.com/v1/playlists/test/tracks?offset=50',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{ track: { uri: 'spotify:track:target' } }],
            next: null,
          }),
        })

      const result = await checkTrackInPlaylist('spotify:track:target', mockEnv)
      expect(result).toBe(true)
    })

    it('returns false when track not found', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { track: { uri: 'spotify:track:111' } },
              { track: { uri: 'spotify:track:222' } },
            ],
            next: null,
          }),
        })

      const result = await checkTrackInPlaylist('spotify:track:notfound', mockEnv)
      expect(result).toBe(false)
    })

    it('throws on API error', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

      await expect(
        checkTrackInPlaylist('spotify:track:123', mockEnv)
      ).rejects.toThrow('checkTrackInPlaylist failed: 500')
    })
  })

  describe('addTrackToPlaylist', () => {
    it('adds track successfully', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
        })

      await expect(
        addTrackToPlaylist('spotify:track:123', mockEnv)
      ).resolves.toBeUndefined()
    })
  })

  describe('removeTrackFromPlaylist', () => {
    it('removes track successfully', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })

      await expect(
        removeTrackFromPlaylist('spotify:track:123', mockEnv)
      ).resolves.toBeUndefined()
    })
  })

  describe('startPlayback', () => {
    it('starts playback successfully', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })

      await expect(startPlayback(mockEnv)).resolves.toBeUndefined()
    })

    it('throws on API error', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        })

      await expect(startPlayback(mockEnv)).rejects.toThrow('startPlayback failed: 403')
    })
  })
})
