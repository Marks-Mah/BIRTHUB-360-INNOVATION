import assert from "node:assert/strict";
import test from "node:test";

import { isBffPathAllowed } from "../app/api/bff/policy";

void test("BFF allowlist blocks admin routes", () => {
  assert.equal(isBffPathAllowed("api/v1/admin/users"), false);
  assert.equal(isBffPathAllowed("api/v1/workflows"), true);
});
