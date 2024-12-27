import { Hono } from "hono";
import { serve } from "bun";
import { PrismaClient } from "@prisma/client";
export const app = new Hono();

app.get("/", (c) => c.text("keep a pulse"));

app.get("/edits", async (c) => {
  const prisma = new PrismaClient();
  const edits = await prisma.mediaWikiRecentChange.findMany();
  return c.json(edits);
});

app.notFound((c) => c.text("huh", 404));

const port = process.env.PORT || 3000;

if (import.meta.main) {
  serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Server running on port ${port}`);
}
