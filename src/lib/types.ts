export interface SpotifyArtist {
	name: string;
}

export interface SpotifyTrack {
	uri: string;
	name: string;
	artists: SpotifyArtist[];
}

export interface SpotifyItem {
	uri?: string;
	name?: string;
	artists?: SpotifyArtist[];
}

export interface SpotifyPlaylist {
	uri?: string;
	name?: string;
}

export interface CurrentlyPlayingResponse {
	item: SpotifyItem | null;
	is_playing: boolean;
}

export interface SpotifyTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
}

export interface PlaylistTracksResponse {
	items: Array<{
		track: SpotifyItem;
	}>;
	next?: string;
}

export interface SpotifyPlaylists {
	items: Array<{
		track: SpotifyPlaylist;
	}>;
	total: number;
	next?: string;
}

export interface SpotifyError {
	error: {
		status: number;
		message: string;
	};
}

// Token endpoint returns OAuth-style errors, not the API error shape above.
export interface SpotifyOAuthError {
	error: string;
	error_description?: string;
}
