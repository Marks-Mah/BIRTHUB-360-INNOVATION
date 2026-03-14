import { Router } from "express";
import { z } from "zod";

import { requireAuthenticated } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { getExecutionFeedback, saveExecutionFeedback } from "./service.js";

const feedbackSchema = z
  .object({
    expectedOutput: z.string().trim().max(10_000).optional(),
    notes: z.string().trim().max(4_000).optional(),
    rating: z.union([z.literal(-1), z.literal(0), z.literal(1)])
  })
  .strict();

function requireIdentity(input: {
  tenantId: string | null;
  userId: string | null;
}) {
  if (!input.tenantId || !input.userId) {
    throw new ProblemDetailsError({
      detail: "Authenticated tenant and user context are required.",
      status: 401,
      title: "Unauthorized"
    });
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId
  };
}

export function createFeedbackRouter(): Router {
  const router = Router();

  router.get(
    "/executions/:id/feedback",
    requireAuthenticated,
    asyncHandler(async (request, response) => {
      const identity = requireIdentity({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const feedback = await getExecutionFeedback({
        executionId: String(request.params.id ?? ""),
        tenantReference: identity.tenantId,
        userId: identity.userId
      });

      response.status(200).json({
        feedback,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/executions/:id/feedback",
    requireAuthenticated,
    asyncHandler(async (request, response) => {
      const identity = requireIdentity({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const payload = feedbackSchema.parse(request.body);
      const feedback = await saveExecutionFeedback({
        executionId: String(request.params.id ?? ""),
        rating: payload.rating,
        tenantReference: identity.tenantId,
        userId: identity.userId,
        ...(payload.expectedOutput !== undefined ? { expectedOutput: payload.expectedOutput } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {})
      });

      response.status(200).json({
        feedback,
        requestId: request.context.requestId
      });
    })
  );

  return router;
}
