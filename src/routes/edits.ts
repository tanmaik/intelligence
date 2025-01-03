import express from "express";
import { prisma } from "../db/client.js";

const edits = express.Router();

// Helper function for consistent error handling
const handleError = (error: any, res: express.Response) => {
  console.log(`[Error] ${error.stack || error.message}`);
  res.status(500).json({ error: "Internal server error" });
};

edits.get("/", async (req, res) => {
  try {
    console.log("[Edits] Fetching all edits");
    const edits = await prisma.mediaWikiRecentChange.findMany();
    console.log(`[Edits] Found ${edits.length} edits`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/24hrs", async (req, res) => {
  try {
    console.log("[Edits] Fetching edits from last 24 hours");
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`[Edits] Found ${edits.length} edits in last 24 hours`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/12hrs", async (req, res) => {
  try {
    console.log("[Edits] Fetching edits from last 12 hours");
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`[Edits] Found ${edits.length} edits in last 12 hours`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/6hrs", async (req, res) => {
  try {
    console.log("[Edits] Fetching edits from last 6 hours");
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`[Edits] Found ${edits.length} edits in last 6 hours`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/3hrs", async (req, res) => {
  try {
    console.log("[Edits] Fetching edits from last 3 hours");
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`[Edits] Found ${edits.length} edits in last 3 hours`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/1hr", async (req, res) => {
  try {
    console.log("[Edits] Fetching edits from last hour");
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`[Edits] Found ${edits.length} edits in last hour`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

edits.post("/spikes", async (req, res) => {
  try {
    const {
      title,
      startTime,
      lastEditTime,
      totalEdits,
      totalBytes,
      isActive = true,
    } = req.body;

    // Check if a spike with same title and startTime exists
    const existingSpike = await prisma.mediaWikiRecentChangeSpike.findFirst({
      where: {
        AND: [{ title }, { startTime: new Date(startTime) }],
      },
    });

    let spike;
    if (existingSpike) {
      // Update existing spike
      spike = await prisma.mediaWikiRecentChangeSpike.update({
        where: { id: existingSpike.id },
        data: {
          lastEditTime: new Date(lastEditTime),
          totalEdits,
          totalBytes,
          isActive,
        },
      });
      console.log(`[Spikes] Updated spike for article '${title}'`);
    } else {
      // Create new spike
      spike = await prisma.mediaWikiRecentChangeSpike.create({
        data: {
          title,
          startTime: new Date(startTime),
          lastEditTime: new Date(lastEditTime),
          totalEdits,
          totalBytes,
          isActive,
        },
      });
      console.log(`[Spikes] Created new spike for article '${title}'`);
    }
    res.json(spike);
  } catch (error) {
    handleError(error, res);
  }
});

export { edits };
