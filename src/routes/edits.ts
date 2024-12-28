import { Hono } from "hono";
import { prisma } from "../db/client";

const edits = new Hono();

edits.get("/", async (c) => {
  const edits = await prisma.mediaWikiRecentChange.findMany();
  return c.json(edits);
});

edits.get("/24hrs", async (c) => {
  const edits = await prisma.mediaWikiRecentChange.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });
  return c.json(edits);
});

edits.get("/12hrs", async (c) => {
  const edits = await prisma.mediaWikiRecentChange.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    },
  });
  return c.json(edits);
});

edits.get("/6hrs", async (c) => {
  const edits = await prisma.mediaWikiRecentChange.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
    },
  });
  return c.json(edits);
});

edits.get("/3hrs", async (c) => {
  const edits = await prisma.mediaWikiRecentChange.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    },
  });
  return c.json(edits);
});

edits.get("/1hr", async (c) => {
  const edits = await prisma.mediaWikiRecentChange.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    },
  });
  return c.json(edits);
});

export { edits };
