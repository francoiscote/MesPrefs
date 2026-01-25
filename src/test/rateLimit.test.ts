import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { rateLimit } from '../middleware/rateLimit'
import { Env } from '../lib/types'

// Reset time between tests
const LIMIT_PER_MINUTE = 60

describe('rateLimit middleware', () => {
  const mockEnv: Env = {
    BEARER_TOKEN: 'test-token',
    SPOTIFY_CLIENT_ID: 'test-id',
    SPOTIFY_CLIENT_SECRET: 'test-secret',
    SPOTIFY_REFRESH_TOKEN: 'test-refresh',
    SPOTIFY_PLAYLIST_ID: 'test-playlist',
  }

  beforeEach(() => {
    // Clear the module cache to reset the rate limit map between tests
    vi.resetModules()
  })

  it('allows requests under limit', async () => {
    // Create fresh app for this test
    const app = new Hono<{ Bindings: Env }>()
    app.use(async (c, next) => {
      c.env = mockEnv
      await next()
    })
    app.get('/protected', rateLimit, (c) => c.json({ success: true }))
    const client = testClient(app)

    for (let i = 0; i < 5; i++) {
      const res = await client.protected.$get({}, {
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(res.status).toBe(200)
    }
  })

  it('rejects request without Authorization header', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use(async (c, next) => {
      c.env = mockEnv
      await next()
    })
    app.get('/protected', rateLimit, (c) => c.json({ success: true }))
    const client = testClient(app)

    const res = await client.protected.$get()
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toBe('Too Many Requests')
  })

  it('different tokens have separate rate limits', async () => {
    const app = new Hono<{ Bindings: Env }>()
    app.use(async (c, next) => {
      c.env = mockEnv
      await next()
    })
    app.get('/protected', rateLimit, (c) => c.json({ success: true }))
    const client = testClient(app)

    // Token 1: 2 requests
    for (let i = 0; i < 2; i++) {
      const res = await client.protected.$get({}, {
        headers: { Authorization: 'Bearer token1' },
      })
      expect(res.status).toBe(200)
    }

    // Token 2: should also allow requests
    const res = await client.protected.$get({}, {
      headers: { Authorization: 'Bearer token2' },
    })
    expect(res.status).toBe(200)
  })
})
