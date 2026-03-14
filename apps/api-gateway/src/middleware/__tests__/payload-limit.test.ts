import assert from "node:assert/strict";
import test from "node:test";
import { payloadLimitMiddleware } from "../payload-limit.js";

function createMockRes() {
  const state: { statusCode?: number; payload?: unknown } = {};
  return {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.payload = payload;
      return this;
    },
    state,
  };
}

test("payloadLimitMiddleware bloqueia quando content-length excede", () => {
  const middleware = payloadLimitMiddleware({ maxBytes: 10, code: "TOO_LARGE" });

  const req = {
    header(name: string) {
      if (name === "content-length") return "20";
      return undefined;
    },
    body: { foo: "bar" },
  };

  const res = createMockRes();
  let nextCalled = false;

  middleware(req as any, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.state.statusCode, 413);
});

test("payloadLimitMiddleware segue fluxo quando payload é válido", () => {
  const middleware = payloadLimitMiddleware({ maxBytes: 1024 });

  const req = {
    header() {
      return undefined;
    },
    body: { foo: "bar" },
  };

  const res = createMockRes();
  let nextCalled = false;

  middleware(req as any, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.state.statusCode, undefined);
});
