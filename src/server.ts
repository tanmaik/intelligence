import app from "./index.js";
import { prisma } from "./db/client.js";

const port = parseInt(process.env.PORT || "8080");

app.listen(port, async () => {
  console.log(`[Server] Running on port ${port}`);
  try {
    const test = await prisma.mediaWikiRecentChange.findFirst();
    console.log("[Server] Database connection successful");
  } catch (error) {
    console.log("[Server] Database connection failed");
    process.exit(1);
  }
});
