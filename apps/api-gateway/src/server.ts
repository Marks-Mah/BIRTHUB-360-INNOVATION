import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { apiV1Router, router } from "./routes/index.js";
import { authenticateToken, type AuthRequest } from "./middleware/auth.js";
import { Express } from "express";
import { openApiDocument } from "./docs/openapi.js";
import { correlationMiddleware } from "./middleware/correlation.js";
import { cloudLoggingMiddleware } from "./middleware/cloud-logging.js";
import { errorHandler } from "./errors/http-error.js";
import { tenantRateLimitMiddleware } from "./middleware/tenant-rate-limit.js";
import { advancedWafMiddleware } from "./middleware/waf-advanced.js";
import { enforceTenantBinding } from "./middleware/tenant-binding.js";
import { tenantObservabilityMiddleware } from "./middleware/tenant-observability.js";
import { tenantContextMiddleware } from "./middleware/tenant-context.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));
app.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
}));
app.use(advancedWafMiddleware);
app.use(correlationMiddleware);
app.use(cloudLoggingMiddleware);

// Public Health Check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

// Swagger Docs
try {
  const swaggerDocument = YAML.load(join(__dirname, "swagger.yaml"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.error("Failed to load swagger.yaml", e);
}

// Authentication Middleware
// Apply to all routes except public ones
app.use((req, res, next) => {
  if (
    req.path === "/health" ||
    req.path === "/openapi.json" ||
    req.path.startsWith("/docs") ||
    req.path.startsWith("/webhooks")
  ) {
    return next();
  }
  return authenticateToken(req as AuthRequest, res, next);
});

// Legacy API redirect
app.use("/api", (req, res, next) => {
  if (!req.path.startsWith("/v1/")) {
    res.set("Deprecation", "true").redirect(308, req.originalUrl.replace("/api/", "/api/v1/"));
    return;
  }
  next();
});

// Routes
app.use("/api/v1", enforceTenantBinding, tenantContextMiddleware, tenantObservabilityMiddleware, tenantRateLimitMiddleware, apiV1Router);
app.use(router);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== "test")
  app.listen(port, () => console.log(`api-gateway on ${port}`));

export default app;
