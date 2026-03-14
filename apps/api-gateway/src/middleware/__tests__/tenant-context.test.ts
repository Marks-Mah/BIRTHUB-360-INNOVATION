import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../errors/http-error.js";
import { resolveTenantContext, resolveTenantId, tenantContextMiddleware } from "../tenant-context.js";

test("tenantContextMiddleware injeta tenant context imutável", () => {
  const req: any = {
    user: { tenantId: "tenant-token" },
  };

  tenantContextMiddleware(req, {} as any, () => undefined);

  assert.deepEqual(resolveTenantContext(req), { tenantId: "tenant-token", source: "token" });
  assert.equal(resolveTenantId(req), "tenant-token");

  assert.throws(() => {
    req.tenantContext = { tenantId: "other", source: "header" };
  }, TypeError);

  assert.throws(() => {
    req.tenantContext.tenantId = "other";
  }, TypeError);
});

test("resolveTenantContext usa header quando token ausente", () => {
  const req: any = {
    header(name: string) {
      return name === "x-tenant-id" ? "tenant-header" : undefined;
    },
  };

  const tenantContext = resolveTenantContext(req);
  assert.deepEqual(tenantContext, { tenantId: "tenant-header", source: "header" });
});

test("tenantContextMiddleware falha sem tenant", () => {
  const req: any = {
    header: () => undefined,
  };

  assert.throws(() => tenantContextMiddleware(req, {} as any, () => undefined), (error: unknown) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.code, "TENANT_CONTEXT_REQUIRED");
    return true;
  });
});
