import { Hono } from "hono";
import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { bearerAuth } from "../middleware/auth";

describe("bearerAuth middleware", () => {
	const mockEnv: Env = {
		BEARER_TOKEN: "valid-secret-token",
		SPOTIFY_CLIENT_ID: "test-id",
		SPOTIFY_CLIENT_SECRET: "test-secret",
		SPOTIFY_REFRESH_TOKEN: "test-refresh",
		SPOTIFY_PLAYLIST_ID: "test-playlist",
		SPOTIFY_REDIRECT_URI: "https://example.com/callback",
		MESPREFS: {
			get: async () => null,
			put: async () => undefined,
			delete: async () => undefined,
		} as unknown as KVNamespace,
	};

	const app = new Hono<{ Bindings: Env }>()
		.use(async (c, next) => {
			c.env = mockEnv;
			await next();
		})
		.get("/protected", bearerAuth, (c) => c.json({ success: true }));

	const client = testClient(app);

	it("returns 401 when no auth header", async () => {
		const res = await client.protected.$get();
		expect(res.status).toBe(401);
		const data = (await res.json()) as { error: string };
		expect(data.error).toBe("Unauthorized");
	});

	it("returns 401 when auth header missing Bearer prefix", async () => {
		const res = await client.protected.$get(
			{},
			{
				headers: { Authorization: "Token valid-secret-token" },
			},
		);
		expect(res.status).toBe(401);
	});

	it("returns 401 when token is invalid", async () => {
		const res = await client.protected.$get(
			{},
			{
				headers: { Authorization: "Bearer wrong-token" },
			},
		);
		expect(res.status).toBe(401);
	});

	it("allows request with valid token", async () => {
		const res = await client.protected.$get(
			{},
			{
				headers: { Authorization: "Bearer valid-secret-token" },
			},
		);
		expect(res.status).toBe(200);
		const data = (await res.json()) as { success: true };
		expect(data.success).toBe(true);
	});

	it("rejects token with extra whitespace", async () => {
		const res = await client.protected.$get(
			{},
			{
				headers: { Authorization: "Bearer  valid-secret-token" },
			},
		);
		expect(res.status).toBe(401);
	});
});
