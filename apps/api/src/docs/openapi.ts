export const openApiDocument = {
  info: {
    title: "BirthHub360 API",
    version: "1.0.0"
  },
  openapi: "3.0.0",
  paths: {
    "/api/v1/agents/search": {
      get: {
        responses: {
          "200": {
            description: "Agent marketplace search results"
          }
        },
        summary: "Search agent manifests"
      }
    },
    "/api/v1/budgets/usage": {
      get: {
        responses: {
          "200": {
            description: "Budget usage snapshot"
          }
        },
        summary: "Get budget usage"
      }
    },
    "/api/v1/outputs": {
      get: {
        responses: {
          "200": {
            description: "List outputs"
          }
        },
        summary: "List outputs"
      }
    }
  },
  servers: [
    {
      url: "http://localhost:3000"
    }
  ]
} as const;
