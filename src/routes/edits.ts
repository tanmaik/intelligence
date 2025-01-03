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

// Spike-related endpoints
edits.get("/spikes/active", async (req, res) => {
  try {
    console.log("[Spikes] Fetching active spikes");
    const spikes = await prisma.articleSpike.findMany({
      where: { isActive: true },
      orderBy: { lastEditTime: "desc" },
    });
    console.log(`[Spikes] Found ${spikes.length} active spikes`);
    res.json(spikes);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/spikes/history", async (req, res) => {
  try {
    console.log("[Spikes] Fetching spike history");
    const spikes = await prisma.articleSpike.findMany({
      where: { isActive: false },
      orderBy: { lastEditTime: "desc" },
    });
    console.log(`[Spikes] Found ${spikes.length} historical spikes`);
    res.json(spikes);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/spikes/article/:title", async (req, res) => {
  try {
    const { title } = req.params;
    console.log(`[Spikes] Fetching spikes for article: ${title}`);
    const spikes = await prisma.articleSpike.findMany({
      where: { title },
      orderBy: { startTime: "desc" },
    });
    console.log(`[Spikes] Found ${spikes.length} spikes for article: ${title}`);
    res.json(spikes);
  } catch (error) {
    handleError(error, res);
  }
});

// Add endpoint to get full edit details for a spike
edits.get("/spikes/:id/edits", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Spikes] Fetching edits for spike ID: ${id}`);

    const spike = await prisma.articleSpike.findUnique({
      where: { id: parseInt(id) },
    });

    if (!spike) {
      return res.status(404).json({ error: "Spike not found" });
    }

    // Fetch all edits between the first and last edit timestamps
    const edits = await prisma.mediaWikiRecentChange.findMany({
      where: {
        title: spike.title,
        timestamp: {
          gte: spike.startTime,
          lte: spike.lastEditTime,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Also fetch the first and last edits by ID
    const [firstEdit, lastEdit] = await Promise.all([
      spike.firstEditId
        ? prisma.mediaWikiRecentChange.findUnique({
            where: { id: spike.firstEditId },
          })
        : null,
      spike.lastEditId
        ? prisma.mediaWikiRecentChange.findUnique({
            where: { id: spike.lastEditId },
          })
        : null,
    ]);

    console.log(`[Spikes] Found ${edits.length} edits for spike ID: ${id}`);
    res.json({
      spike,
      firstEdit,
      lastEdit,
      edits,
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Handle spike creation/updates from Go service
edits.post("/spikes", async (req, res) => {
  try {
    const spikeData = req.body;
    console.log(`[Spikes] Received spike data for article: ${spikeData.title}`);

    // Check for existing similar spikes to avoid duplicates
    const existingSpikes = await prisma.articleSpike.findMany({
      where: {
        title: spikeData.title,
        isActive: true,
        // Look for spikes that started within 5 minutes of this one
        startTime: {
          gte: new Date(spikeData.startTime.getTime() - 5 * 60 * 1000),
          lte: new Date(spikeData.startTime.getTime() + 5 * 60 * 1000),
        },
      },
    });

    // If we find a similar active spike, update it instead of creating a new one
    if (existingSpikes.length > 0) {
      const existingSpike = existingSpikes[0];
      console.log(`[Spikes] Updating existing spike ID: ${existingSpike.id}`);

      const updatedSpike = await prisma.articleSpike.update({
        where: { id: existingSpike.id },
        data: {
          lastEditTime: new Date(spikeData.lastEditTime),
          totalEdits: spikeData.totalEdits,
          totalBytes: spikeData.totalBytes,
          isActive: spikeData.isActive,
          lastEditId: spikeData.lastEditId,
        },
      });

      res.json(updatedSpike);
    } else {
      // Create a new spike if no similar ones exist
      console.log(
        `[Spikes] Creating new spike for article: ${spikeData.title}`
      );
      const newSpike = await prisma.articleSpike.create({
        data: {
          title: spikeData.title,
          startTime: new Date(spikeData.startTime),
          lastEditTime: new Date(spikeData.lastEditTime),
          totalEdits: spikeData.totalEdits,
          totalBytes: spikeData.totalBytes,
          isActive: spikeData.isActive,
          firstEditId: spikeData.firstEditId,
          lastEditId: spikeData.lastEditId,
        },
      });

      res.json(newSpike);
    }
  } catch (error) {
    handleError(error, res);
  }
});

export { edits };
