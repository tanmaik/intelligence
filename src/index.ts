import { Hono } from "hono";
import { serve } from "bun";
import { cors } from "hono/cors";
import { edits } from "./routes/edits";

export const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => c.text("keep a pulse"));

app.route("/edits", edits);

app.notFound((c) => c.text("huh", 404));

const port = process.env.PORT || 3000;

if (import.meta.main) {
  serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Server running on port ${port}`);
}
