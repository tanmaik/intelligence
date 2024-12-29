import express from "express";
import cors from "cors";
import { edits } from "./routes/edits.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  console.log("[Health Check] Server is running");
  res.send("keep a pulse");
});

app.use("/edits", edits);

// 404 handler
app.use((req, res) => {
  console.warn(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(`[Error] ${err.stack || err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`[Server] Running on port ${port}`);
});
