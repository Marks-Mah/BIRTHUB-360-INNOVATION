import { Router } from "express";
import { asyncHandler } from "../errors/http-error.js";
import { MarketingService } from "../services/marketing-service.js";
import { MarketingRepository } from "../repositories/marketing-repository.js";

const marketingRouter: Router = Router();
const marketingService = new MarketingService(new MarketingRepository());

marketingRouter.post("/campaigns/ingest", asyncHandler(async (req, res) => {
  const campaign = await marketingService.ingestCampaignData(req.body);
  res.status(201).json(campaign);
}));

marketingRouter.get("/campaigns", asyncHandler(async (_req, res) => {
  const campaigns = await marketingService.listCampaigns();
  res.json(campaigns);
}));

export { marketingRouter };
