import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve(process.cwd(), "apps/api/src/app.ts");
const source = readFileSync(appPath, "utf8");

const routeRegex = /app\.(get|post|patch|delete)\(\s*"([^"]+)"/g;
const publicRoutes = new Set([
  "/api/openapi.json",
  "/api/v1/health",
  "/api/v1/auth/login",
  "/api/v1/auth/mfa/challenge",
  "/api/v1/auth/refresh",
  "/api/v1/organizations",
  "/api/auth/introspect"
]);

let match: RegExpExecArray | null;
const violations: string[] = [];

while ((match = routeRegex.exec(source))) {
  const routePath = match[2];
  const start = match.index;
  const end = source.indexOf("\n  );", start);
  const block = source.slice(start, end === -1 ? source.length : end);
  const guarded =
    block.includes("requireAuthenticated") || block.includes("RequireRole(");

  if (!guarded && !publicRoutes.has(routePath)) {
    violations.push(routePath);
  }
}

if (violations.length > 0) {
  console.error(`Found unguarded routes: ${violations.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("All non-public routes are guarded.");
}
