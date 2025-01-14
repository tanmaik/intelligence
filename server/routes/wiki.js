import express from "express";
import { prisma } from "../db/client.js";

const wiki = express.Router();

const handleError = (error, res) => {
  console.log(`${error.stack || error.message}`);
  res.status(500).json({ error: "Internal server error" });
};

wiki.get("/edits", async (req, res) => {
  try {
    const edits = await prisma.wikiEdit.findMany();
    console.log(`Found ${edits.length} edits`);
    res.json(edits);
  } catch (error) {
    handleError(error, res);
  }
});

wiki.post("/edits/spikes", async (req, res) => {
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

wiki.get("/edits/spikes/active", async (req, res) => {
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

wiki.get("/edits/spikes/recent", async (req, res) => {
  try {
    console.log("Fetching recent spikes");
    const spikes = await prisma.wikiEditSpike.findMany({
      where: {
        lastEditTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

wiki.post("/edits", async (req, res) => {
  try {
    const {
      title,
      title_url,
      comment,
      user,
      bot,
      notify_url,
      minor,
      length_old,
      length_new,
      server_url,
    } = req.body;

    const edit = await prisma.wikiEdit.create({
      data: {
        title,
        titleUrl: title_url,
        comment,
        user,
        bot,
        notifyUrl: notify_url,
        minor,
        lengthOld: length_old,
        lengthNew: length_new,
        serverUrl: server_url,
      },
    });
    console.log(`Created edit for article '${title}'`);
    res.json(edit);
  } catch (error) {
    handleError(error, res);
  }
});

export { wiki };
