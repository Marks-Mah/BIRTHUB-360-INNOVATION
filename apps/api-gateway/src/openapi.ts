export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "BirtHub 360 API Gateway",
    version: "1.0.0",
    description: "API central para operações RevOps e orquestração de agentes.",
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
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Healthcheck",
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/v1/leads": {
      get: {
        summary: "Listar leads",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Criar lead",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/deals": {
      get: {
        summary: "Listar deals",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Criar deal",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/customers": {
      get: {
        summary: "Listar clientes",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/invoices": {
      get: {
        summary: "Listar faturas",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/contracts/analyze": {
      post: {
        summary: "Analisar contrato",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/analytics/funnel": {
      get: {
        summary: "Análise de funil",
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
};
