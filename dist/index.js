import express from "express";
import { main as startEditStream } from "./data/edits.js";
const app = express();
const port = 3000;
app.get("/", (_req, res) => {
    res.send("keep a pulse");
});
app.use((_req, res) => {
    res.status(404).send("huh");
});
startEditStream().catch(console.error);
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
