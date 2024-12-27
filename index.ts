import { Hono } from "hono";
import { getFileSize } from "./monitor";
import { main as startEditStream } from "./data/edits";

const app = new Hono();
app.get("/", (c) => c.text("keep a pulse"));

app.get("/monitor", (c) => {
  return c.text(getFileSize("./prisma/dev.db").toString());
});

app.notFound((c) => {
  return c.text("huh", 404);
});

startEditStream().catch(console.error);

export default {
  port: 3000,
  fetch: app.fetch,
};
