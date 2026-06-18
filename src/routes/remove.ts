import type { Context } from "hono";
import { getCurrentlyPlaying, removeTrackFromPlaylist } from "../lib/spotify";

export async function removeHandler(ctx: Context<{ Bindings: Env }>) {
	try {
		const track = await getCurrentlyPlaying(ctx.env);

		if (!track) {
			return ctx.json({ error: "No track currently playing" }, 400);
		}

		await removeTrackFromPlaylist(track.uri, ctx.env);

		return ctx.json({
			success: true,
			track,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("removeHandler error:", message);
		return ctx.json({ error: "Spotify API error" }, 502);
	}
}
