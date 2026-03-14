import test from "node:test";
import assert from "node:assert/strict";
import { meterUsage } from "../../index.js";

test("meterUsage appends record", () => {
  const store: any[] = [];
  const rec = meterUsage(store, "t1", "agent_executions", 2);
  assert.equal(store.length, 1);
  assert.equal(rec.metric, "agent_executions");
});

test("meterUsage keeps quantity", () => {
  const store: any[] = [];
  const rec = meterUsage(store, "t1", "api_calls", 5);
  assert.equal(rec.quantity, 5);
});

test("multiple usage records", () => {
  const store: any[] = [];
  meterUsage(store, "t1", "m1", 1);
  meterUsage(store, "t1", "m2", 2);
  assert.equal(store.length, 2);
});

test("tenant mapping", () => {
  const store: any[] = [];
  const rec = meterUsage(store, "tenant-x", "m", 1);
  assert.equal(rec.tenantId, "tenant-x");
});

test("timestamp exists", () => {
  const store: any[] = [];
  const rec = meterUsage(store, "t", "m", 1);
  assert.ok(rec.createdAt instanceof Date);
});
