import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bearerAuth } from "../middleware/auth";
import { addHandler } from "../routes/add";
import { currentHandler } from "../routes/current";
import { healthHandler } from "../routes/health";
import { playHandler } from "../routes/play";
import { removeHandler } from "../routes/remove";

const mockEnv: Env = {
	BEARER_TOKEN: "test-token",
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

describe("API Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Health endpoint", () => {
		const app = new Hono<{ Bindings: Env }>().get("/health", healthHandler);
		const client = testClient(app);

		it("returns 200 with ok status", async () => {
			const res = await client.health.$get();
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.status).toBe("ok");
			expect(typeof data.timestamp).toBe("number");
		});
	});

	describe("Current endpoint", () => {
		const app = new Hono<{ Bindings: Env }>()
			.use(async (c, next) => {
				c.env = mockEnv;
				await next();
			})
			.get("/current", bearerAuth, currentHandler);
		const client = testClient(app);

		it("returns 401 without auth", async () => {
			const res = await client.current.$get();
			expect(res.status).toBe(401);
		});

		it("returns currently playing track", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						item: {
							uri: "spotify:track:123",
							name: "Test Song",
							artists: [{ name: "Test Artist" }],
						},
						is_playing: true,
					}),
				});

			const res = await client.current.$get(
				{},
				{
					headers: { Authorization: "Bearer test-token" },
				},
			);
			expect(res.status).toBe(200);

			const data = (await res.json()) as {
				track: { uri: string; name: string };
			};
			expect(data.track.uri).toBe("spotify:track:123");
			expect(data.track.name).toBe("Test Song");
		});
	});

	describe("Add endpoint", () => {
		const app = new Hono<{ Bindings: Env }>()
			.use(async (c, next) => {
				c.env = mockEnv;
				await next();
			})
			.post("/add", bearerAuth, addHandler);
		const client = testClient(app);

		it("returns 401 without auth", async () => {
			const res = await client.add.$post();
			expect(res.status).toBe(401);
		});

		it("returns 400 when no track currently playing", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 204,
				});

			const res = await client.add.$post(
				{},
				{
					headers: { Authorization: "Bearer test-token" },
				},
			);
			expect(res.status).toBe(400);

			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("No track currently playing");
		});

		it("returns 409 when track already in playlist", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						item: {
							uri: "spotify:track:123",
							name: "Test Song",
							artists: [{ name: "Test Artist" }],
						},
						is_playing: true,
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						items: [{ track: { uri: "spotify:track:123" } }],
						next: null,
					}),
				});

			const res = await client.add.$post(
				{},
				{
					headers: { Authorization: "Bearer test-token" },
				},
			);
			expect(res.status).toBe(409);

			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("Track already in playlist");
		});
	});

	describe("Remove endpoint", () => {
		const app = new Hono<{ Bindings: Env }>()
			.use(async (c, next) => {
				c.env = mockEnv;
				await next();
			})
			.post("/remove", bearerAuth, removeHandler);
		const client = testClient(app);

		it("returns 401 without auth", async () => {
			const res = await client.remove.$post();
			expect(res.status).toBe(401);
		});

		it("returns 400 when no track currently playing", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 204,
				});

			const res = await client.remove.$post(
				{},
				{
					headers: { Authorization: "Bearer test-token" },
				},
			);
			expect(res.status).toBe(400);

			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("No track currently playing");
		});
	});

	describe("Play endpoint", () => {
		const app = new Hono<{ Bindings: Env }>()
			.use(async (c, next) => {
				c.env = mockEnv;
				await next();
			})
			.post("/play", bearerAuth, playHandler);
		const client = testClient(app);

		it("returns 401 without auth", async () => {
			const res = await client.play.$post();
			expect(res.status).toBe(401);
		});

		it("starts playback successfully", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 204,
				});

			const res = await client.play.$post(
				{},
				{
					headers: { Authorization: "Bearer test-token" },
				},
			);
			expect(res.status).toBe(200);

			const data = (await res.json()) as { success: true };
			expect(data.success).toBe(true);
		});

		it("returns 502 on Spotify API error", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 403,
				});

			const res = await client.play.$post(
				{},
				{
					headers: { Authorization: "Bearer test-token" },
				},
			);
			expect(res.status).toBe(502);

			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("Spotify API error");
		});
	});

	describe("404 handling", () => {
		const app = new Hono<{ Bindings: Env }>()
			.get("/health", healthHandler)
			.notFound(() => new Response("Not Found", { status: 404 }));

		it("returns 404 for unknown routes", async () => {
			const res = await app.request("/unknown");
			expect(res.status).toBe(404);
		});
	});
});
