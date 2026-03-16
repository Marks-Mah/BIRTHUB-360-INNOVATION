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

const logger = createLogger({ service: "api-gateway" });

const app: Express = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    supportedSurface: ["POST /api/v1/leads", "PATCH /api/v1/internal/organizations/:id/plan", "PATCH /api/v1/internal/activities/:id"]
  })
);

app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api/v1", apiV1Router);
app.use(router);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== "test")
  app.listen(port, () => logger.info("api-gateway-listening", { port, surface: "supported" }));

export default app;
