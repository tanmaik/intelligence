import express from "express";
import { prisma } from "../db/client.js";

const edits = express.Router();

edits.get("/", async (req, res) => {
  try {
    const edits = await prisma.mediaWikiRecentChange.findMany();
    res.json(edits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

edits.get("/24hrs", async (req, res) => {
  try {
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    res.json(edits);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

edits.get("/12hrs", async (req, res) => {
  try {
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      },
    });
    res.json(edits);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

edits.get("/6hrs", async (req, res) => {
  try {
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
      },
    });
    res.json(edits);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

edits.get("/3hrs", async (req, res) => {
  try {
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
      },
    });
    res.json(edits);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

edits.get("/1hr", async (req, res) => {
  try {
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      },
    });
    res.json(edits);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { edits };
