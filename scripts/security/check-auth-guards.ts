import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve } from "node:path";

import ts from "typescript";

type RouteViolation = {
  file: string;
  message: string;
  method: string;
  path: string;
};

type TextViolation = {
  file: string;
  message: string;
};

type ScanResult = {
  routeViolations: RouteViolation[];
  textViolations: TextViolation[];
};

const workspaceRoot = process.cwd();
const apiSourceRoot = resolve(workspaceRoot, "apps/api/src");
const routeFilePattern = /(?:^|[\\/])(app|server|router)\.ts$|(?:^|[\\/]).+-routes\.ts$/;
const publicRoutes = new Set([
  "/health",
  "/health/deep",
  "/api/openapi.json",
  "/api/v1/health",
  "/api/v1/health/deep",
  "/api/v1/auth/login",
  "/api/v1/auth/mfa/challenge",
  "/api/v1/auth/refresh",
  "/api/v1/organizations",
  "/orgs",
  "/organizations",
  "/invites/accept",
  "/webhooks/trigger/:id"
]);

const sensitiveReadMatchers = [
  /^\/api\/v1\/workflows(?:\/.*)?$/,
  /^\/orgs\/[^/]+\/(?:members|audit)(?:\/.*)?$/,
  /^\/api\/v1\/agents\/installed(?:\/.*)?$/,
  /^\/api\/v1\/budgets(?:\/.*)?$/,
  /^\/api\/v1\/outputs(?:\/.*)?$/,
  /^\/api\/v1\/packs(?:\/.*)?$/,
  /^\/api\/v1\/(?:me|sessions)(?:\/.*)?$/,
  /^\/api\/v1\/settings\/webhooks(?:\/.*)?$/,
  /^\/invites$/
];

const adminMatchers = [
  /^\/api\/v1\/workflows(?:\/.*)?$/,
  /^\/orgs\/[^/]+\/(?:members|audit)(?:\/export)?$/,
  /^\/api\/v1\/agents\/installed(?:\/.*)?$/,
  /^\/api\/v1\/budgets(?:\/usage|\/limits|\/consume|\/export\.csv)?$/,
  /^\/api\/v1\/outputs\/(?:[^/]+\/approve|prune)$/,
  /^\/api\/v1\/packs(?:\/.*)?$/,
  /^\/api\/v1\/(?:apikeys|users|team\/members)(?:\/.*)?$/,
  /^\/api\/v1\/settings\/webhooks(?:\/.*)?$/,
  /^\/invites(?:\/[^/]+\/revoke)?$/,
  /^\/api\/v1\/privacy\/export$/,
  /^\/api\/v1\/billing\/(?:checkout|portal)$/
];

const allowedRawHeaderFiles = new Map<string, Set<string>>([
  [
    "x-active-tenant",
    new Set([normalizePath(join(apiSourceRoot, "middlewares/tenantContext.ts"))])
  ]
]);

const textRules = [
  {
    allowIn: new Set<string>(),
    message: "default-tenant fallback is forbidden in production paths.",
    pattern: /\bdefault-tenant\b/g
  },
  {
    allowIn: new Set<string>(),
    message: "birthhub-alpha fallback is forbidden in production paths.",
    pattern: /\bbirthhub-alpha\b/g
  },
  {
    allowIn: new Set<string>(),
    message: "Sensitive mutations must not enqueue audit events with actorId: null.",
    pattern: /actorId:\s*null/g
  },
  {
    allowIn: new Set<string>(),
    message: "Raw x-tenant-id headers must not be used as an authorization source.",
    pattern: /header\(["']x-tenant-id["']\)/g
  },
  {
    allowIn: allowedRawHeaderFiles.get("x-active-tenant") ?? new Set<string>(),
    message: "Raw x-active-tenant headers are only allowed in the tenant binding middleware.",
    pattern: /header\(["']x-active-tenant["']\)/g
  },
  {
    allowIn: new Set<string>(),
    message: "JWT payload decoding without verification is forbidden.",
    pattern: /jwt\.decode\(|Buffer\.from\(parts\[1\],\s*["']base64url["']\)/g
  }
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function walkDirectory(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walkDirectory(fullPath));
      continue;
    }

    if (stats.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function isPublicRoute(path: string): boolean {
  return publicRoutes.has(path);
}

function isSensitiveRead(path: string): boolean {
  return sensitiveReadMatchers.some((matcher) => matcher.test(path));
}

function isAdministrative(path: string): boolean {
  return adminMatchers.some((matcher) => matcher.test(path));
}

function extractLiteralPath(argument: ts.Expression | undefined): string | null {
  if (!argument) {
    return null;
  }

  if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
    return argument.text;
  }

  return null;
}

function getMiddlewareTexts(sourceFile: ts.SourceFile, args: readonly ts.Expression[]): string[] {
  return args.slice(1).map((argument) => argument.getText(sourceFile));
}

function scanRouteFile(filePath: string): RouteViolation[] {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const violations: RouteViolation[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text.toLowerCase();

      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const routePath = extractLiteralPath(node.arguments[0]);

        if (routePath) {
          const middlewareTexts = getMiddlewareTexts(sourceFile, node.arguments);
          const hasSessionGuard = middlewareTexts.some((text) =>
            text.includes("requireAuthenticatedSession")
          );
          const hasRoleGuard = middlewareTexts.some((text) => text.includes("RequireRole("));
          const mutating = method !== "get";
          const publicRoute = isPublicRoute(routePath);
          const sensitiveRead = method === "get" && isSensitiveRead(routePath);
          const administrative = isAdministrative(routePath);

          if (!publicRoute && (mutating || sensitiveRead) && !hasSessionGuard) {
            violations.push({
              file: filePath,
              message:
                "Sensitive route is missing requireAuthenticatedSession and could accept non-session auth or bypassed context.",
              method,
              path: routePath
            });
          }

          if (!publicRoute && administrative && !hasRoleGuard) {
            violations.push({
              file: filePath,
              message: "Administrative route is missing RequireRole.",
              method,
              path: routePath
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function scanTextRules(filePath: string): TextViolation[] {
  const source = readFileSync(filePath, "utf8");
  const normalizedPath = normalizePath(filePath);
  const violations: TextViolation[] = [];

  for (const rule of textRules) {
    rule.pattern.lastIndex = 0;
    if (!rule.pattern.test(source)) {
      continue;
    }

    if (rule.allowIn.has(normalizedPath)) {
      continue;
    }

    violations.push({
      file: filePath,
      message: rule.message
    });
  }

  return violations;
}

export function scanAuthGuards(root = apiSourceRoot): ScanResult {
  const files = walkDirectory(root);
  const routeFiles = files.filter((filePath) => routeFilePattern.test(filePath));
  const routeViolations = routeFiles.flatMap((filePath) => scanRouteFile(filePath));
  const textViolations = files.flatMap((filePath) => scanTextRules(filePath));

  return {
    routeViolations,
    textViolations
  };
}

function formatFile(filePath: string): string {
  return normalizePath(relative(workspaceRoot, filePath));
}

function printViolations(result: ScanResult): void {
  for (const violation of result.routeViolations) {
    console.error(
      `[route] ${formatFile(violation.file)} ${violation.method.toUpperCase()} ${violation.path}: ${violation.message}`
    );
  }

  for (const violation of result.textViolations) {
    console.error(`[text] ${formatFile(violation.file)}: ${violation.message}`);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  normalizePath(resolve(process.argv[1])) === normalizePath(resolve(fileURLToPath(import.meta.url)));

if (isDirectExecution) {
  const result = scanAuthGuards();

  if (result.routeViolations.length > 0 || result.textViolations.length > 0) {
    printViolations(result);
    process.exitCode = 1;
  } else {
    console.log("Auth guard scan passed for apps/api route files and sensitive source paths.");
  }
}
