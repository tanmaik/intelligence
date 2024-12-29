import express from "express";
import cors from "cors";
import { edits } from "./routes/edits.js";
import { prisma } from "./db/client.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  console.log("[Health Check] Server is running");
  res.send("keep a pulse");
});

app.use("/edits", edits);

app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).send("huh");
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.log(`[Error] ${err.stack || err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;
