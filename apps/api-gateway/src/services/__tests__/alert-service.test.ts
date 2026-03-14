import assert from "node:assert/strict";
import test from "node:test";
import { AlertService } from "../alert-service.js";

test("AlertService sends alert without crashing", async () => {
  const service = new AlertService();
  await service.sendAlert("Test Alert", "This is a test message", "info");
  assert.ok(true);
});
