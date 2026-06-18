import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addTrackToPlaylist,
	checkTrackInPlaylist,
	getCurrentlyPlaying,
	RefreshTokenExpiredError,
	removeTrackFromPlaylist,
	startPlayback,
} from "../lib/spotify";

const mockEnv: Env = {
	BEARER_TOKEN: "test-token",
	SPOTIFY_CLIENT_ID: "test-client-id",
	SPOTIFY_CLIENT_SECRET: "test-secret",
	SPOTIFY_REFRESH_TOKEN: "test-refresh-token",
	SPOTIFY_PLAYLIST_ID: "test-playlist-id",
};

describe("Spotify service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("token refresh", () => {
		it("throws RefreshTokenExpiredError and clears KV on invalid_grant", async () => {
			const del = vi.fn().mockResolvedValue(undefined);
			const env: Env = {
				...mockEnv,
				MESPREFS: {
					get: vi.fn().mockResolvedValue(null),
					put: vi.fn().mockResolvedValue(undefined),
					delete: del,
				} as unknown as KVNamespace,
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({
					error: "invalid_grant",
					error_description: "Refresh token revoked",
				}),
			});

			await expect(getCurrentlyPlaying(env)).rejects.toThrow(
				RefreshTokenExpiredError,
			);
			expect(del).toHaveBeenCalledWith("spotify_refreshToken");
			// No retry: only the token request was made.
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it("throws generic error on other token failures", async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ error: "server_error" }),
			});

			await expect(getCurrentlyPlaying(mockEnv)).rejects.toThrow(
				"Access Token request failed: 500 - server_error",
			);
		});
	});

	describe("getCurrentlyPlaying", () => {
		it("returns track when item exists", async () => {
			const mockTrack = {
				uri: "spotify:track:123",
				name: "Test Track",
				artists: [{ name: "Test Artist" }],
			};

			global.fetch = vi
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
						item: mockTrack,
						is_playing: true,
					}),
				});

			const result = await getCurrentlyPlaying(mockEnv);

			expect(result).toEqual(mockTrack);
		});

		it("returns null when status 204", async () => {
			global.fetch = vi
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

			const result = await getCurrentlyPlaying(mockEnv);
			expect(result).toBeNull();
		});

		it("returns null when item is null", async () => {
			global.fetch = vi
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
					json: async () => ({ item: null, is_playing: false }),
				});

			const result = await getCurrentlyPlaying(mockEnv);
			expect(result).toBeNull();
		});

		it("returns null when item missing uri", async () => {
			global.fetch = vi
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
						item: { name: "Track", artists: [] },
						is_playing: true,
					}),
				});

			const result = await getCurrentlyPlaying(mockEnv);
			expect(result).toBeNull();
		});
	});

	describe("checkTrackInPlaylist", () => {
		it("returns true when track found on first page", async () => {
			global.fetch = vi
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
					json: async () => ({
						items: [
							{ track: { uri: "spotify:track:123" } },
							{ track: { uri: "spotify:track:456" } },
						],
						next: null,
					}),
				});

			const result = await checkTrackInPlaylist("spotify:track:123", mockEnv);
			expect(result).toBe(true);
		});

		it("returns true when track found on subsequent page", async () => {
			global.fetch = vi
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
					json: async () => ({
						items: [{ track: { uri: "spotify:track:other" } }],
						next: "https://api.spotify.com/v1/playlists/test/tracks?offset=50",
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
						items: [{ track: { uri: "spotify:track:target" } }],
						next: null,
					}),
				});

			const result = await checkTrackInPlaylist(
				"spotify:track:target",
				mockEnv,
			);
			expect(result).toBe(true);
		});

		it("returns false when track not found", async () => {
			global.fetch = vi
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
					json: async () => ({
						items: [
							{ track: { uri: "spotify:track:111" } },
							{ track: { uri: "spotify:track:222" } },
						],
						next: null,
					}),
				});

			const result = await checkTrackInPlaylist(
				"spotify:track:notfound",
				mockEnv,
			);
			expect(result).toBe(false);
		});

		it("throws on API error", async () => {
			global.fetch = vi
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
					status: 500,
					json: async () => ({
						error: {
							status: "SpotifyErrorCode",
							message: "Spotify error message",
						},
					}),
				});

			await expect(
				checkTrackInPlaylist("spotify:track:123", mockEnv),
			).rejects.toThrow(
				"checkTrackInPlaylist failed: SpotifyErrorCode - Spotify error message",
			);
		});
	});

	describe("addTrackToPlaylist", () => {
		it("adds track successfully", async () => {
			global.fetch = vi
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
					status: 201,
				});

			await expect(
				addTrackToPlaylist("spotify:track:123", mockEnv),
			).resolves.toBeTruthy();
		});
	});

	describe("removeTrackFromPlaylist", () => {
		it("removes track successfully", async () => {
			global.fetch = vi
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
				});

			await expect(
				removeTrackFromPlaylist("spotify:track:123", mockEnv),
			).resolves.toBeTruthy();
		});
	});

	describe("startPlayback", () => {
		it("starts playback successfully", async () => {
			global.fetch = vi
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

			const result = await startPlayback(mockEnv);
			expect(result).toEqual({ ok: true, status: 204 });
		});

		it("throws on API error", async () => {
			global.fetch = vi
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
					json: async () => ({
						error: {
							status: "SpotifyErrorCode",
							message: "Spotify error message",
						},
					}),
				});

			await expect(startPlayback(mockEnv)).rejects.toThrow(
				"startPlayback failed: SpotifyErrorCode - Spotify error message",
			);
		});
	});
});
