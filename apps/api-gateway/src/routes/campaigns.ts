import { Router } from "express";

export const campaignsRouter = Router();

campaignsRouter.get("/", (_req, res) => {
  res.json({ items: [{ id: "cmp-default", status: "draft" }] });
});

campaignsRouter.post("/", (req, res) => {
  res.status(201).json({ id: `cmp-${Date.now()}`, ...req.body, status: "scheduled" });
});
