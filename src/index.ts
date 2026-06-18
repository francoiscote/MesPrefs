import { Hono } from "hono";
import { logger } from "hono/logger";
import { RefreshTokenExpiredError } from "./lib/spotify";
import { bearerAuth } from "./middleware/auth";
import { rateLimit } from "./middleware/rateLimit";
import { addHandler } from "./routes/add";
import { callbackHandler, loginHandler } from "./routes/auth";
import { currentHandler } from "./routes/current";
import { healthHandler } from "./routes/health";
import { landingHandler } from "./routes/landing";
import { playHandler } from "./routes/play";
import { playlistsHandler } from "./routes/playlists";
import { removeHandler } from "./routes/remove";

const app = new Hono<{ Bindings: Env }>();
app.use(logger());

// An expired/revoked refresh token can't be retried — tell the caller to re-auth.
app.onError((err, c) => {
	if (err instanceof RefreshTokenExpiredError) {
		return c.json(
			{
				error: "reauth_required",
				message: err.message,
				loginUrl: "/api/auth/login",
			},
			401,
		);
	}
	console.error(err);
	return c.text("Internal Server Error", 500);
});

// Public routes
app.get("/", landingHandler);
app.get("/health", healthHandler);

app.get("/api/auth/callback", callbackHandler);
// Protected routes
const protected_ = new Hono<{ Bindings: Env }>();
protected_.use("*", bearerAuth, rateLimit);
protected_.get("/current", currentHandler);
protected_.get("/playlists", playlistsHandler);
protected_.post("/add", addHandler);
protected_.post("/remove", removeHandler);
protected_.post("/play", playHandler);
protected_.get("/auth/login", loginHandler);

app.route("/api/", protected_);

// 404 handler
app.notFound(() => new Response("Not Found", { status: 404 }));

export default app;
