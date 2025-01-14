import express from "express";
import cors from "cors";
import { wiki } from "./routes/wiki.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  res.send("pulse");
});

app.use("/wiki", wiki);

app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.path}`);
  res.status(404).send("huh");
});

app.use((err, req, res, next) => {
  console.log(`${err.stack || err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
