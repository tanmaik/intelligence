import { Hono } from "hono";
import { serve } from "bun";

export const app = new Hono();

app.get("/", (c) => c.text("keep a pulse"));

app.notFound((c) => c.text("huh", 404));

const port = process.env.PORT || 3000;

if (import.meta.main) {
  serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Server running at http://localhost:${port}`);
}
