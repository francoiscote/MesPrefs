import type {
	CurrentlyPlayingResponse,
	PlaylistTracksResponse,
	SpotifyPlaylists,
	SpotifyError,
	SpotifyOAuthError,
	SpotifyTokenResponse,
	SpotifyTrack,
} from "./types";

/**
 * Thrown when the refresh token is no longer valid (expired or revoked).
 * As of Spotify's 2026-06-18 policy, refresh tokens expire 6 months after
 * authorization. The only fix is user re-authorization — callers must not retry.
 */
export class RefreshTokenExpiredError extends Error {
	constructor(
		message = "Refresh token expired or revoked. Re-authenticate at /api/auth/login",
	) {
		super(message);
		this.name = "RefreshTokenExpiredError";
	}
}

async function fetchAccessToken(env: Env): Promise<string> {
	// Get refresh token from KV first, fallback to env var
	const refreshToken =
		(await env.MESPREFS?.get("spotify_refreshToken")) ||
		env.SPOTIFY_REFRESH_TOKEN;

	if (!refreshToken) {
		throw new Error(
			"No refresh token available. Complete OAuth flow at /auth/login",
		);
	}

	const auth = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			Authorization: `Basic ${auth}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		const err = await response.json<SpotifyOAuthError>().catch(() => null);

		// `invalid_grant` means the refresh token expired (6-month lifetime as of
		// Spotify's 2026-06-18 policy) or was revoked. Discard the dead token so we
		// don't keep retrying, and signal that re-authorization is required.
		if (err?.error === "invalid_grant") {
			await Promise.all([
				env.MESPREFS?.delete("spotify_refreshToken"),
				env.MESPREFS?.delete("spotify_accessToken"),
				env.MESPREFS?.delete("spotify_accessToken_expiry"),
				env.MESPREFS?.delete("spotify_refreshToken_issuedAt"),
			]);
			throw new RefreshTokenExpiredError();
		}

		throw new Error(
			`Access Token request failed: ${response.status}${err?.error ? ` - ${err.error}` : ""}`,
		);
	}

	const data = (await response.json()) as SpotifyTokenResponse;
	await env.MESPREFS?.put("spotify_accessToken", data.access_token);

	// Handle token rotation - Spotify may return new refresh token
	if (data.refresh_token) {
		await env.MESPREFS?.put("spotify_refreshToken", data.refresh_token);
	}

	const expiry = Date.now() + data.expires_in * 1000;
	await env.MESPREFS?.put("spotify_accessToken_expiry", expiry.toString(10));
	return data.access_token;
}

async function getAccessToken(env: Env): Promise<string> {
	const cachedAccessToken = await env.MESPREFS?.get("spotify_accessToken");
	const cachedTokenExpiry = await env.MESPREFS?.get(
		"spotify_accessToken_expiry",
	);

	if (!cachedAccessToken || !cachedTokenExpiry) {
		return fetchAccessToken(env);
	}

	const expires_in = Number(cachedTokenExpiry) - Date.now();

	if (expires_in < 1000 * 60 * 5) {
		return fetchAccessToken(env);
	}

	return cachedAccessToken;
}

async function spotifyFetch(
	methodId: string,
	url: string,
	options: RequestInit,
	env: Env,
): Promise<Response> {
	const token = await getAccessToken(env);
	const headers = new Headers(options.headers || {});
	headers.set("Authorization", `Bearer ${token}`);

	const response = await fetch(url, { ...options, headers });

	if (!response.ok) {
		const { error } = await response.json<SpotifyError>();
		throw new Error(`${methodId} failed: ${error.status} - ${error.message}`);
	}

	return response;
}

export async function getCurrentlyPlaying(
	env: Env,
): Promise<SpotifyTrack | null> {
	const response = await spotifyFetch(
		"getCurrentlyPlaying",
		"https://api.spotify.com/v1/me/player/currently-playing",
		{ method: "GET" },
		env,
	);

	// 204 = nothing playing
	if (response.status === 204) {
		return null;
	}

	const data = (await response.json()) as CurrentlyPlayingResponse;

	if (!data.item || !data.item.uri) {
		return null;
	}

	return {
		uri: data.item.uri,
		name: data.item.name || "Unknown",
		artists: data.item.artists || [],
	};
}

export async function getPlaylists(env: Env): Promise<SpotifyPlaylists | null> {
	const response = await spotifyFetch(
		"getPlaylists",
		"https://api.spotify.com/v1/me/playlists",
		{ method: "GET" },
		env,
	);

	// 204 = nothing playing
	if (response.status === 204) {
		return null;
	}

	const data = (await response.json()) as SpotifyPlaylists;

	if (data.total === 0) {
		return null;
	}

	return data;
}

export async function checkTrackInPlaylist(
	trackUri: string,
	env: Env,
): Promise<boolean> {
	const playlistId = env.SPOTIFY_PLAYLIST_ID;
	let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

	while (url) {
		const response = await spotifyFetch(
			"checkTrackInPlaylist",
			url,
			{ method: "GET" },
			env,
		);

		const data = (await response.json()) as PlaylistTracksResponse;

		for (const item of data.items) {
			if (item.track.uri === trackUri) {
				return true;
			}
		}

		url = data.next || "";
	}

	return false;
}

export async function addTrackToPlaylist(
	trackUri: string,
	env: Env,
): Promise<Response> {
	const playlistId = env.SPOTIFY_PLAYLIST_ID;

	return await spotifyFetch(
		"addTrackToPlaylist",
		`https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uris: [trackUri] }),
		},
		env,
	);
}

export async function removeTrackFromPlaylist(
	trackUri: string,
	env: Env,
): Promise<Response> {
	const playlistId = env.SPOTIFY_PLAYLIST_ID;

	return await spotifyFetch(
		"removeTrackFromPlaylist",
		`https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
		},
		env,
	);
}

export async function startPlayback(env: Env): Promise<Response> {
	const playlistId = env.SPOTIFY_PLAYLIST_ID;

	return await spotifyFetch(
		"startPlayback",
		"https://api.spotify.com/v1/me/player/play",
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
		},
		env,
	);
}
