import express from "express";
import cors from "cors";
import { edits } from "./routes/edits.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("keep a pulse"));

app.use("/edits", edits);

app.use((req, res) => res.status(404).send("huh"));

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
