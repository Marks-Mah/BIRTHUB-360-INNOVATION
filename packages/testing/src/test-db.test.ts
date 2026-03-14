import assert from "node:assert/strict";
import test from "node:test";

import { provisionTestDatabase } from "./test-db.js";

void test("testing package exposes isolated database provisioning helper", () => {
  assert.equal(typeof provisionTestDatabase, "function");
});
