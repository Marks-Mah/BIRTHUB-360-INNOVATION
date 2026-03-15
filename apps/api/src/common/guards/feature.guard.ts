import type { NextFunction, Request, RequestHandler, Response } from "express";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import {
  isPlanFeatureEnabled,
  type PlanFeature
} from "../../modules/billing/plan.utils.js";
import { canUseFeature } from "../../modules/billing/service.js";

const DEFAULT_GRACE_PERIOD_DAYS = 3;

export function RequireFeature(feature: PlanFeature): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const organizationId = request.context.organizationId;

      if (!organizationId) {
        throw new ProblemDetailsError({
          detail: "Authentication is required before checking plan features.",
          status: 401,
          title: "Unauthorized"
        });
      }

      if (request.context.billingPlanStatus?.limits) {
        const featureEnabled = isPlanFeatureEnabled(
          request.context.billingPlanStatus.limits,
          feature
        );

        if (!featureEnabled || request.context.billingPlanStatus.hardLocked) {
          throw new ProblemDetailsError({
            detail: request.context.billingPlanStatus.hardLocked
              ? "Your subscription is locked due to failed payments. Update billing to continue."
              : `The active plan does not include feature '${feature}'.`,
            status: 402,
            title: "Payment Required"
          });
        }

        next();
        return;
      }

      const { allowed, snapshot } = await canUseFeature(
        organizationId,
        feature,
        DEFAULT_GRACE_PERIOD_DAYS
      );

      if (!allowed) {
        throw new ProblemDetailsError({
          detail: snapshot.hardLocked
            ? "Your subscription is locked due to failed payments. Update billing to continue."
            : `The active plan does not include feature '${feature}'.`,
          status: 402,
          title: "Payment Required"
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
