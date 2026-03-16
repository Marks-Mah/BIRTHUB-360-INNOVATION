import assert from "node:assert/strict";
import test from "node:test";

import { isSupportedSessionAction } from "../app/api/auth/session-actions";

test("session action allowlist", () => {
  assert.equal(isSupportedSessionAction("signin"), true);
  assert.equal(isSupportedSessionAction("unsupported"), false);
});
