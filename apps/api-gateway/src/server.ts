import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { apiV1Router, router } from "./routes/supported.js";
import { openApiDocument } from "./docs/openapi.js";
import { errorHandler } from "./errors/http-error.js";
import { createLogger } from "./lib/logger.js";
import { resolveGatewayProxyPath } from "./proxy/path-map.js";
import { proxyExpressRequest } from "./proxy/service-proxy.js";

const logger = createLogger({ service: "api-gateway" });
const primaryApiUrl = process.env.PRIMARY_API_URL?.trim() || process.env.API_URL?.trim() || "http://localhost:3000";
const legacyCompatEnabled =
  (process.env.LEGACY_API_GATEWAY_ENABLE_DEV_COMPAT === "true" ||
    process.env.NODE_ENV === "test") &&
  process.env.NODE_ENV !== "production" &&
  process.env.CI !== "true";

const app: Express = express();
app.use(helmet());
app.use(cors());
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  const services: Record<string, Record<string, string>> = {
    primaryApi: {
      status: "up",
      url: primaryApiUrl
    }
  };
  let status = "ok";

  try {
    const upstream = await fetch(`${primaryApiUrl}/health`);
    if (!upstream.ok) {
      status = "degraded";
      services.primaryApi = {
        message: `unexpected_status_${upstream.status}`,
        status: "down",
        url: primaryApiUrl
      };
    }
  } catch (error) {
    status = "degraded";
    services.primaryApi = {
      message: error instanceof Error ? error.message : String(error),
      status: "down",
      url: primaryApiUrl
    };
  }

  res.json({
    mode: legacyCompatEnabled ? "compat-dev" : "proxy",
    services,
    status,
    supportedSurface: legacyCompatEnabled
      ? [
          "POST /api/v1/leads",
          "PATCH /api/v1/internal/organizations/:id/plan",
          "PATCH /api/v1/internal/activities/:id"
        ]
      : []
  });
});

app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
if (legacyCompatEnabled) {
  app.use("/api/v1", apiV1Router);
  app.use(router);
}
app.use(async (req, res, next) => {
  try {
    await proxyExpressRequest(req, res, {
      baseUrl: primaryApiUrl,
      path: resolveGatewayProxyPath(req.originalUrl),
      serviceName: "primary-api"
    });
  } catch (error) {
    next(error);
  }
});
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== "test")
  app.listen(port, () =>
    logger.info("api-gateway-listening", {
      mode: legacyCompatEnabled ? "compat-dev" : "proxy",
      port,
      primaryApiUrl
    })
  );

export default app;
