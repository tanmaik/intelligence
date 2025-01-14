import express from "express";
import { prisma } from "../db/client.js";

const edits = express.Router();

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

    const existingSpike = await prisma.wikiEditSpike.findFirst({
      where: {
        AND: [
          { title },
          {
            startTime: {
              gte: new Date(new Date(startTime).getTime() - 5 * 60 * 1000),
              lte: new Date(new Date(startTime).getTime() + 5 * 60 * 1000),
            },
          },
        ],
      },
    });

    let spike;
    if (existingSpike) {
      spike = await prisma.wikiEditSpike.update({
        where: { id: existingSpike.id },
        data: {
          lastEditTime: new Date(lastEditTime),
          totalEdits,
          totalBytes,
          isActive,
        },
      });
      console.log(`Updated spike for article '${title}'`);
    } else {
      spike = await prisma.wikiEditSpike.create({
        data: {
          title,
          startTime: new Date(startTime),
          lastEditTime: new Date(lastEditTime),
          totalEdits,
          totalBytes,
          isActive,
        },
      });
      console.log(`Created new spike for article '${title}'`);
    }
    res.json(spike);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/spikes/active", async (req, res) => {
  try {
    console.log("Fetching active spikes");
    const spikes = await prisma.wikiEditSpike.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        lastEditTime: "desc",
      },
      take: 10,
    });
    console.log(`Found ${spikes.length} active spikes`);
    res.json(spikes);
  } catch (error) {
    handleError(error, res);
  }
});

edits.get("/spikes/recent", async (req, res) => {
  try {
    console.log("Fetching recent spikes");
    const spikes = await prisma.wikiEditSpike.findMany({
      where: {
        lastEditTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: {
        lastEditTime: "desc",
      },
      take: 20,
    });
    console.log(`Found ${spikes.length} recent spikes`);
    res.json(spikes);
  } catch (error) {
    handleError(error, res);
  }
});

export { edits };
