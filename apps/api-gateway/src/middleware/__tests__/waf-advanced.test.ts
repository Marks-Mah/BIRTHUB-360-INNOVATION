import assert from "node:assert/strict";
import test from "node:test";
import { createAdvancedWafMiddleware } from "../waf-advanced.js";

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

test("advancedWaf bloqueia user-agent malicioso", () => {
  const middleware = createAdvancedWafMiddleware();
  const req = {
    ip: "10.0.0.1",
    socket: { remoteAddress: "10.0.0.1" },
    originalUrl: "/api/v1/leads",
    query: {},
    body: {},
    header(name: string) {
      return name === "user-agent" ? "sqlmap/1.0" : undefined;
    },
  };

  const res = createMockRes();
  middleware(req as any, res as any, () => undefined);

  assert.equal(res.state.statusCode, 403);
});

test("advancedWaf bloqueia payload suspeito", () => {
  const middleware = createAdvancedWafMiddleware();
  const req = {
    ip: "10.0.0.1",
    socket: { remoteAddress: "10.0.0.1" },
    originalUrl: "/api/v1/customers?q=1",
    query: { search: "1 UNION SELECT password" },
    body: {},
    header() {
      return "Mozilla";
    },
  };

  const res = createMockRes();
  middleware(req as any, res as any, () => undefined);

  assert.equal(res.state.statusCode, 406);
});


test("advancedWaf bloqueia IP direto e CIDR", () => {
  const middleware = createAdvancedWafMiddleware({ blockedIpRules: ["10.0.0.8", "192.168.1.0/24"] });

  const reqIp = {
    ip: "10.0.0.8",
    socket: { remoteAddress: "10.0.0.8" },
    originalUrl: "/api/v1/leads",
    query: {},
    body: {},
    header() {
      return "Mozilla";
    },
  };

  const resIp = createMockRes();
  middleware(reqIp as any, resIp as any, () => undefined);
  assert.equal(resIp.state.statusCode, 403);

  const reqCidr = {
    ip: "::ffff:192.168.1.44",
    socket: { remoteAddress: "::ffff:192.168.1.44" },
    originalUrl: "/api/v1/leads",
    query: {},
    body: {},
    header() {
      return "Mozilla";
    },
  };

  const resCidr = createMockRes();
  middleware(reqCidr as any, resCidr as any, () => undefined);
  assert.equal(resCidr.state.statusCode, 403);
});
