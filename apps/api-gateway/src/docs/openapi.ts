const routes = [
  ["POST", "/api/v1/leads", "Criar lead"],
  ["GET", "/api/v1/leads", "Listar leads"],
  ["GET", "/api/v1/leads/{id}", "Detalhes do lead"],
  ["PATCH", "/api/v1/leads/{id}/status", "Atualizar status do lead"],
  ["POST", "/api/v1/leads/{id}/enrich", "Forçar enriquecimento de lead"],
  ["POST", "/api/v1/leads/{id}/outreach", "Acionar outreach SDR"],
  ["POST", "/api/v1/deals", "Criar deal"],
  ["GET", "/api/v1/deals", "Listar deals"],
  ["PATCH", "/api/v1/deals/{id}/stage", "Atualizar estágio do deal"],
  ["POST", "/api/v1/deals/{id}/proposal", "Gerar proposta"],
  ["POST", "/api/v1/deals/{id}/roi-calculator", "Calcular ROI"],
  ["GET", "/api/v1/deals/{id}/forecast", "Forecast do deal"],
  ["GET", "/api/v1/customers", "Listar customers"],
  ["GET", "/api/v1/customers/{id}/health", "Health score do customer"],
  ["GET", "/api/v1/customers/{id}/timeline", "Timeline do customer"],
  ["POST", "/api/v1/customers/{id}/nps", "Registrar NPS"],
  ["GET", "/api/v1/invoices", "Listar invoices"],
  ["POST", "/api/v1/invoices/{id}/dunning", "Executar dunning"],
  ["GET", "/api/v1/financial/cashflow", "Forecast de caixa"],
  ["GET", "/api/v1/financial/commissions", "Relatório de comissões"],
  ["POST", "/api/v1/financial/reconcile", "Conciliação financeira"],
  ["POST", "/api/v1/contracts/analyze", "Analisar contrato"],
  ["POST", "/api/v1/contracts/generate", "Gerar contrato"],
  ["GET", "/api/v1/contracts/{id}/status", "Status de assinatura do contrato"],
  ["POST", "/api/v1/contracts/kyc", "Executar KYC/KYB"],
  ["GET", "/api/v1/analytics/funnel", "Análise de funil"],
  ["GET", "/api/v1/analytics/attribution", "Atribuição multi-touch"],
  ["GET", "/api/v1/analytics/anomalies", "Anomalias detectadas"],
  ["POST", "/api/v1/analytics/board-report", "Gerar board report"],
  ["POST", "/webhooks/stripe", "Webhook Stripe"],
  ["POST", "/webhooks/docusign", "Webhook DocuSign"],
  ["POST", "/webhooks/clicksign", "Webhook Clicksign"],
  ["POST", "/webhooks/focus-nfe", "Webhook Focus NFe"],
  ["POST", "/webhooks/meta-ads", "Webhook Meta Ads"],
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
