import type { Context } from "hono";

export async function healthHandler(ctx: Context<{ Bindings: Env }>) {
	return ctx.json({
		status: "ok",
		timestamp: Date.now(),
	});
}
