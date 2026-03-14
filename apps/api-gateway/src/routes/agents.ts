import { Router } from "express";
import { asyncHandler } from "../errors/http-error.js";
import { AgentLogRepository } from "../repositories/agent-log-repository.js";

const agentRouter: Router = Router();
const agentLogRepository = new AgentLogRepository();

agentRouter.get("/logs", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const logs = await agentLogRepository.findMany(limit, offset);
  res.json(logs);
}));

export { agentRouter as agentsRouter };
