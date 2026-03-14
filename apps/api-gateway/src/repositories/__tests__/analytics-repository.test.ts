import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsRepository } from "../analytics-repository.js";

test("AnalyticsRepository retorna métricas agregadas", async () => {
  const repository = new AnalyticsRepository();
  const funnel = await repository.getFunnelMetrics();
  const attribution = await repository.getAttributionMetrics();

  assert.ok(funnel.visitors > 0);
  assert.ok(Array.isArray(attribution.channels));
});
