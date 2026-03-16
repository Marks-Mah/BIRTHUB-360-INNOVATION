import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { scanAuthGuards } from "./check-auth-guards.ts";

function createFixtureFile(root: string, relativePath: string, contents: string): void {
  const fullPath = join(root, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents, "utf8");
}

void test("scanner flags mutating routes without session auth and admin routes without role guard", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-guards-"));

  try {
    createFixtureFile(
      root,
      "modules/bad/router.ts",
      `
        import { Router } from "express";
        const router = Router();
        router.post("/api/v1/workflows", async () => {});
        router.get("/orgs/:id/audit", requireAuthenticatedSession, async () => {});
        export default router;
      `
    );

    const result = scanAuthGuards(root);

    assert.equal(result.routeViolations.length, 3);
    assert.equal(
      result.routeViolations.some((violation) => violation.path === "/api/v1/workflows"),
      true
    );
    assert.equal(
      result.routeViolations.some((violation) => violation.path === "/orgs/:id/audit"),
      true
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

void test("scanner allows public routes and secure admin routes", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-guards-ok-"));

  try {
    createFixtureFile(
      root,
      "modules/good/router.ts",
      `
        import { Router } from "express";
        const router = Router();
        router.post("/api/v1/auth/login", async () => {});
        router.post("/api/v1/workflows", requireAuthenticatedSession, RequireRole(Role.ADMIN), async () => {});
        export default router;
      `
    );

    const result = scanAuthGuards(root);

    assert.deepEqual(result.routeViolations, []);
    assert.deepEqual(result.textViolations, []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

void test("scanner honors inherited router.use guards and allows workflow reads with session-only auth", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-guards-inherited-"));

  try {
    createFixtureFile(
      root,
      "modules/inherited/router.ts",
      `
        import { Router } from "express";
        const router = Router();
        router.use(requireAuthenticatedSession);
        router.use(RequireRole(Role.ADMIN));
        router.get("/api/v1/workflows/:id", async () => {});
        router.post("/api/v1/apikeys", async () => {});
        export default router;
      `
    );

    const result = scanAuthGuards(root);

    assert.deepEqual(result.routeViolations, []);
    assert.deepEqual(result.textViolations, []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

void test("scanner treats dashboard endpoints as admin-sensitive", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-guards-dashboard-"));

  try {
    createFixtureFile(
      root,
      "modules/dashboard/router.ts",
      `
        import { Router } from "express";
        const router = Router();
        router.get("/api/v1/dashboard/metrics", requireAuthenticatedSession, async () => {});
        export default router;
      `
    );

    const result = scanAuthGuards(root);

    assert.equal(result.routeViolations.length, 1);
    assert.equal(result.routeViolations[0]?.path, "/api/v1/dashboard/metrics");
    assert.match(result.routeViolations[0]?.message ?? "", /RequireRole/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

void test("scanner honors path-scoped router.use guards", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-guards-scoped-use-"));

  try {
    createFixtureFile(
      root,
      "modules/dashboard/router.ts",
      `
        import { Router } from "express";
        const router = Router();
        router.use("/api/v1/dashboard", requireAuthenticatedSession, RequireRole(Role.ADMIN));
        router.get("/api/v1/dashboard/metrics", async () => {});
        export default router;
      `
    );

    const result = scanAuthGuards(root);

    assert.deepEqual(result.routeViolations, []);
    assert.deepEqual(result.textViolations, []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
