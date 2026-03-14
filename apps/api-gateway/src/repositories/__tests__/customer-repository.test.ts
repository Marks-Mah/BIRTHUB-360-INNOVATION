import assert from "node:assert/strict";
import test from "node:test";
import { CustomerRepository } from "../customer-repository.js";

test("CustomerRepository retorna healthScore calculado", async () => {
  const repository = new CustomerRepository();
  const customers = await repository.listWithHealthScore("tenant-a");

  assert.ok(customers.length > 0);
  assert.equal(typeof customers[0].healthScore, "number");
  assert.ok(customers[0].healthScore >= 0 && customers[0].healthScore <= 100);
});

test("CustomerRepository registra NPS e expõe timeline por tenant", async () => {
  const repository = new CustomerRepository();
  await repository.registerNps("tenant-a", "cust_1", 10, "excellent");

  const timeline = await repository.listTimeline("tenant-a", "cust_1");
  assert.ok(timeline.length > 0);
  assert.ok(timeline[0].description.includes("NPS"));
});
