import express from "express";
import { z } from "zod";

import { createLogger } from "../lib/logger.js";
import { requireJwt } from "../auth.js";

export const leadsRouter = express.Router();
const logger = createLogger({ scope: "legacy-lead-intake" });
const legacyLeadIntakeSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  source: z.string().trim().min(2).max(60).optional()
});

leadsRouter.use(requireJwt);

leadsRouter.post("/", async (req, res) => {
  const parsed = legacyLeadIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      details: {
        errors: parsed.error.issues.map((issue) => {
          const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
          return `${path}${issue.message}`;
        })
      },
      message: "Invalid request body"
    });
  }

  logger.info("legacy-lead-accepted", {
    email: parsed.data.email,
    source: parsed.data.source ?? "manual"
  });

  res.status(202).json({
    lead_id: "lead_" + Math.random().toString(36).slice(2, 11),
    message: "Lead received and processing started",
    status: "accepted"
  });
});

leadsRouter.get("/", async (req, res) => {
  res.json({ leads: [] });
});
