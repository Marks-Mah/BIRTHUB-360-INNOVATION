import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "webhook-receiver" });
});

app.post("/svix/events", (req: Request, res: Response) => {
  res
    .status(202)
    .json({ accepted: true, eventType: req.body?.type ?? "unknown" });
});

const port = Number(process.env.PORT ?? 3010);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Webhook receiver listening on ${port}`);
});
