import type { Context, Next } from "hono";

function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export async function bearerAuth(ctx: Context<{ Bindings: Env }>, next: Next) {
	const authHeader = ctx.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return ctx.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.slice(7);
	const expectedToken = ctx.env.BEARER_TOKEN;

	if (!constantTimeCompare(token, expectedToken)) {
		return ctx.json({ error: "Unauthorized" }, 401);
	}

	await next();
}
