import { Router } from "express";

export const reportsRouter = Router();

reportsRouter.post("/generate", (req, res) => {
  res.status(202).json({ reportId: `rpt-${Date.now()}`, status: "queued", params: req.body ?? {} });
});

reportsRouter.get("/:id", (req, res) => {
  res.json({ id: req.params.id, status: "processing" });
});
