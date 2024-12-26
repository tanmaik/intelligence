import { Hono } from "hono";

const app = new Hono();
app.get("/", (c) => c.text("Hello Bun!"));

app.get("/monitor", (c) => {
  return c.text("dummy");
});

app.notFound((c) => {
  return c.text("huh", 404);
});

export default {
  port: 3000,
  fetch: app.fetch,
};
