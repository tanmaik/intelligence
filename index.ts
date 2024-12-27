import express, { Request, Response } from "express";

const app = express();
const port = 3000;

app.get("/", (_req: Request, res: Response) => {
  res.send("keep a pulse");
});
app.use((_req: Request, res: Response) => {
  res.status(404).send("huh");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
