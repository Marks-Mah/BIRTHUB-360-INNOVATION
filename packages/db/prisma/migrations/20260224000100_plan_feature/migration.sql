CREATE TABLE "PlanFeature" (
  "id" TEXT NOT NULL,
  "plan" "Plan" NOT NULL,
  "feature" TEXT NOT NULL,
  "limit" INTEGER,
  CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanFeature_plan_feature_key" ON "PlanFeature"("plan", "feature");
