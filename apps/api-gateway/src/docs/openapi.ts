const routes = [
  ["POST", "/api/v1/leads", "Criar lead"],
  ["PATCH", "/api/v1/internal/organizations/{id}/plan", "Atualizar plano interno"],
  ["GET", "/api/v1/internal/organizations/{id}/plan", "Consultar plano interno"],
  ["PATCH", "/api/v1/internal/activities/{id}", "Atualizar status interno de activity"],
  ["GET", "/api/v1/internal/activities/{id}", "Consultar status interno de activity"],
] as const;

const buildPaths = () => {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const [method, path, summary] of routes) {
    const key = method.toLowerCase();
    if (!paths[path]) paths[path] = {};

    paths[path][key] = {
      summary,
      tags: [path.split("/")[2] || "webhooks"],
      responses: {
        "200": { description: "Success" },
        "201": { description: "Created" },
        "400": { description: "Bad request" },
        "401": { description: "Unauthorized" },
        "404": { description: "Not found" },
      },
      security: path.startsWith("/webhooks") ? [] : [{ bearerAuth: [] }],
    };
  }

  return paths;
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "BirtHub 360 API Gateway",
    version: "1.0.0",
    description:
      "API central de orquestração RevOps para o ecossistema BirtHub 360.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: buildPaths(),
};
