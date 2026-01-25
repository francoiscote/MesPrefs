import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { bearerAuth } from '../auth'
import { Env } from '../../lib/types'

describe('bearerAuth middleware', () => {
  const mockEnv: Env = {
    BEARER_TOKEN: 'valid-secret-token',
    SPOTIFY_CLIENT_ID: 'test-id',
    SPOTIFY_CLIENT_SECRET: 'test-secret',
    SPOTIFY_REFRESH_TOKEN: 'test-refresh',
    SPOTIFY_PLAYLIST_ID: 'test-playlist',
  }

  const app = new Hono<{ Bindings: Env }>()
  app.use(async (c, next) => {
    c.env = mockEnv
    await next()
  })
  app.get('/protected', bearerAuth, (c) => c.json({ success: true }))

  const client = testClient(app)

  it('returns 401 when no auth header', async () => {
    const res = await client.protected.$get()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when auth header missing Bearer prefix', async () => {
    const res = await client.protected.$get({}, {
      headers: { Authorization: 'Token valid-secret-token' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await client.protected.$get({}, {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    expect(res.status).toBe(401)
  })

  it('allows request with valid token', async () => {
    const res = await client.protected.$get({}, {
      headers: { Authorization: 'Bearer valid-secret-token' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('rejects token with extra whitespace', async () => {
    const res = await client.protected.$get({}, {
      headers: { Authorization: 'Bearer  valid-secret-token' },
    })
    expect(res.status).toBe(401)
  })
})
