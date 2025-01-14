import app from "./index";
import { prisma } from "./db/client";

const port = parseInt(process.env.PORT || "8080");

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
  try {
    const test = await prisma.wikiEdit.findFirst();
    console.log("Database connection successful");
  } catch (error) {
    console.log("Database connection failed");
    console.error(error);
    process.exit(1);
  }
});
