import { Hono } from "hono";
import { logger } from "hono/logger";
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
