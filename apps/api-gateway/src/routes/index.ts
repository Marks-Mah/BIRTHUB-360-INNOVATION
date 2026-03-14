import type { Request } from "express";
import { Router } from "express";
import { payloadLimitMiddleware } from "../middleware/payload-limit.js";
import { webhookIdempotencyMiddleware } from "../middleware/webhook-idempotency.js";
import { webhookSignatureMiddleware } from "../middleware/webhook-signature.js";
import { featureToggleMiddleware } from "../middleware/feature-toggle.js";
import { requireAuthorization } from "../middleware/authorization.js";
import { auditTrailMiddleware } from "../middleware/audit-trail.js";
import { LeadNotFoundError } from "../errors/lead-errors.js";
import { asyncHandler, HttpError } from "../errors/http-error.js";
import { LeadStatus, LeadRepository } from "../repositories/lead-repository.js";
import { DealRepository } from "../repositories/deal-repository.js";
import { CustomerRepository } from "../repositories/customer-repository.js";
import { FinancialRepository } from "../repositories/financial-repository.js";
import { ContractRepository } from "../repositories/contract-repository.js";
import { AnalyticsRepository } from "../repositories/analytics-repository.js";
import { LeadService } from "../services/lead-service.js";
import { DealService } from "../services/deal-service.js";
import { CustomerService } from "../services/customer-service.js";
import { FinancialService } from "../services/financial-service.js";
import { ContractService } from "../services/contract-service.js";
import { AnalyticsService } from "../services/analytics-service.js";
import { createPaymentAdapterFromEnv, PaymentService } from "../integrations/payment-adapter.js";
import { isFinancialReconcileInput } from "../contracts/internal-contracts.js";
import { resolveTenantId } from "../middleware/tenant-context.js";
import { requireFeature } from "../middleware/plan-guard.js";
import { LLMClient, type CompletionOptions, type Message } from "../services/llm-client.js";
import { validateSchema } from "../middleware/validate.js";
import { authRouter } from "./auth.js";
import { agentsRouter } from "./agents.js";
import { campaignsRouter } from "./campaigns.js";
import { reportsRouter } from "./reports.js";
import {
  dealIdParamsSchema,
  leadEnrichmentBodySchema,
  leadOutreachBodySchema,
  proposalBodySchema,
} from "../schemas/engagement-schemas.js";
import {
  createLeadBodySchema,
  leadIdParamsSchema,
  listLeadsQuerySchema,
  updateLeadStatusBodySchema,
} from "../schemas/lead-schemas.js";
import {
  createContractBodySchema,
  createDealBodySchema,
  customerIdParamsSchema,
  customerNpsBodySchema,
  financialReconcileBodySchema,
  updateContractStatusBodySchema,
  updateContractVersionBodySchema,
  updateDealStageBodySchema,
} from "../schemas/domain-schemas.js";
import {
  commonCursorQuerySchema,
  contractsListQuerySchema,
  dealsListQuerySchema,
  invoiceIdParamsSchema,
} from "../schemas/pagination-schemas.js";

export const apiV1Router: Router = Router();
export const router: Router = Router();

const leadRepository = new LeadRepository();
const dealRepository = new DealRepository();
const customerRepository = new CustomerRepository();
const financialRepository = new FinancialRepository();
const contractRepository = new ContractRepository();
const analyticsRepository = new AnalyticsRepository();

const leadService = new LeadService(leadRepository);
const dealService = new DealService(dealRepository, contractRepository);
const customerService = new CustomerService(customerRepository);
const financialService = new FinancialService(financialRepository);
const contractService = new ContractService(contractRepository);
const analyticsService = new AnalyticsService(analyticsRepository);

const paymentService = new PaymentService(createPaymentAdapterFromEnv(), {
  timeoutMs: 3_000,
  retryAttempts: 3,
  baseBackoffMs: 250,
  circuitBreakerFailures: 2,
  circuitBreakerCooldownMs: 30_000,
});

const parseLeadStatus = (value: unknown): LeadStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const candidate = value.toUpperCase();
  const allowed: LeadStatus[] = ["NEW", "QUALIFIED", "CONTACTED", "LOST"];
  return allowed.includes(candidate as LeadStatus) ? (candidate as LeadStatus) : undefined;
};

const logDomainEvent = (event: string, payload: Record<string, unknown>): void => {
  console.info(JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }));
};

const internalOrgPlans = new Map<string, "STARTER" | "PRO" | "ENTERPRISE">();
const internalActivityStatus = new Map<string, string>();

const llmClient = new LLMClient();

apiV1Router.post("/ai/complete", asyncHandler(async (req, res) => {
  const payload = req.body as { messages?: Message[]; systemPrompt?: string; options?: CompletionOptions };
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new HttpError(400, "INVALID_AI_PAYLOAD", "messages is required and must be a non-empty array");
  }

  const messages = payload.systemPrompt
    ? [{ role: "system", content: payload.systemPrompt } as Message, ...payload.messages]
    : payload.messages;
  const completion = await llmClient.chat(messages, payload.options);
  res.json(completion);
}));

apiV1Router.post("/agents/ldr/qualify", requireFeature("ldr_agent"), asyncHandler(async (req, res) => {
  res.status(202).json({ accepted: true, leadId: req.body?.leadId ?? null });
}));

apiV1Router.patch("/internal/organizations/:id/plan", asyncHandler(async (req, res) => {
  const candidate = typeof req.body?.plan === "string" ? req.body.plan.toUpperCase() : "";
  if (candidate !== "STARTER" && candidate !== "PRO" && candidate !== "ENTERPRISE") {
    throw new HttpError(400, "INVALID_PLAN", "Plan must be STARTER, PRO or ENTERPRISE");
  }
  internalOrgPlans.set(req.params.id, candidate);
  res.json({ id: req.params.id, plan: candidate, updated: true });
}));

apiV1Router.get("/internal/organizations/:id/plan", asyncHandler(async (req, res) => {
  res.json({ id: req.params.id, plan: internalOrgPlans.get(req.params.id) ?? "STARTER" });
}));

apiV1Router.patch("/internal/activities/:id", asyncHandler(async (req, res) => {
  const status = typeof req.body?.status === "string" ? req.body.status : "UNKNOWN";
  internalActivityStatus.set(req.params.id, status);
  res.json({ id: req.params.id, status, updated: true });
}));

apiV1Router.get("/internal/activities/:id", asyncHandler(async (req, res) => {
  res.json({ id: req.params.id, status: internalActivityStatus.get(req.params.id) ?? "UNKNOWN" });
}));


apiV1Router.use("/auth", authRouter);
apiV1Router.use("/agents", agentsRouter);
apiV1Router.use("/campaigns", campaignsRouter);
apiV1Router.use("/reports", reportsRouter);

apiV1Router.post("/leads", validateSchema({ body: createLeadBodySchema }), asyncHandler(async (req, res) => {
  const lead = await leadService.createLead(resolveTenantId(req), req.body);
  res.status(201).json(lead);
}));

apiV1Router.get("/leads", validateSchema({ query: listLeadsQuerySchema }), asyncHandler(async (req, res) => {
  const result = await leadService.listLeads({
    tenantId: resolveTenantId(req),
    cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
    limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
    filters: {
      status: parseLeadStatus(req.query.status),
      minScore: typeof req.query.minScore === "string" ? Number(req.query.minScore) : undefined,
      assignee: typeof req.query.assignee === "string" ? req.query.assignee : undefined,
    },
    sortBy: req.query.sortBy === "score" || req.query.sortBy === "createdAt" ? req.query.sortBy : undefined,
    sortOrder: req.query.sortOrder === "asc" || req.query.sortOrder === "desc" ? req.query.sortOrder : undefined,
  });
  res.json(result);
}));

apiV1Router.get("/leads/:id", validateSchema({ params: leadIdParamsSchema }), asyncHandler(async (req, res) => {
  try {
    res.json(await leadService.getLeadById(resolveTenantId(req), req.params.id));
  } catch (error) {
    if (error instanceof LeadNotFoundError) throw new HttpError(404, error.code, error.message);
    throw error;
  }
}));

apiV1Router.patch("/leads/:id/status", validateSchema({ params: leadIdParamsSchema, body: updateLeadStatusBodySchema }), asyncHandler(async (req, res) => {
  try {
    res.json(await leadService.updateLeadStatus(resolveTenantId(req), req.params.id, req.body.status as LeadStatus));
  } catch (error) {
    if (error instanceof LeadNotFoundError) throw new HttpError(404, error.code, error.message);
    throw error;
  }
}));

apiV1Router.delete("/leads/:id", validateSchema({ params: leadIdParamsSchema }), asyncHandler(async (req, res) => {
  try {
    await leadService.deleteLead(resolveTenantId(req), req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof LeadNotFoundError) throw new HttpError(404, error.code, error.message);
    throw error;
  }
}));

apiV1Router.post("/leads/:id/enrich", featureToggleMiddleware({ featureName: "lead_enrichment" }), validateSchema({ params: leadIdParamsSchema, body: leadEnrichmentBodySchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const result = await leadService.enqueueEnrichment(tenant, req.params.id, req.body);
  logDomainEvent("lead.enrichment.queued", { tenantId: tenant, leadId: req.params.id, source: req.body.source });
  res.status(202).json({ schemaVersion: "v1", ...result });
}));

apiV1Router.post("/leads/:id/outreach", featureToggleMiddleware({ featureName: "lead_outreach" }), validateSchema({ params: leadIdParamsSchema, body: leadOutreachBodySchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const result = await leadService.enqueueOutreach(tenant, req.params.id, req.body);
  logDomainEvent("lead.outreach.queued", { tenantId: tenant, leadId: req.params.id, channel: req.body.channel });
  res.status(202).json({ schemaVersion: "v1", ...result });
}));

apiV1Router.post("/deals", requireAuthorization({ roles: ["admin", "sales_manager"] }), validateSchema({ body: createDealBodySchema }), auditTrailMiddleware("deals.create"), asyncHandler(async (req, res) => {
  const deal = await dealRepository.create(resolveTenantId(req), { title: req.body.title, amount: Number(req.body.amount), stage: "NEW" });
  res.status(201).json(deal);
}));
apiV1Router.get("/deals", validateSchema({ query: dealsListQuerySchema }), asyncHandler(async (req, res) => res.json(await dealRepository.list(resolveTenantId(req), req.query.cursor as string | undefined, req.query.limit as number | undefined, { stage: req.query.stage as never, minAmount: req.query.minAmount as number | undefined, maxAmount: req.query.maxAmount as number | undefined }))));
apiV1Router.patch("/deals/:id/stage", requireAuthorization({ scopes: ["deals:write"] }), validateSchema({ params: dealIdParamsSchema, body: updateDealStageBodySchema }), auditTrailMiddleware("deals.update_stage"), asyncHandler(async (req, res) => {
  const deal = await dealService.moveStage(resolveTenantId(req), req.params.id, req.body.stage);
  const history = await dealRepository.getHistory(resolveTenantId(req), req.params.id);
  res.json({ deal, history });
}));

apiV1Router.get("/customers", validateSchema({ query: commonCursorQuerySchema }), asyncHandler(async (req, res) => res.json(await customerService.listHealthScore(resolveTenantId(req), req.query.cursor as string | undefined, req.query.limit as number | undefined))));
apiV1Router.get("/financial/summary", asyncHandler(async (req, res) => res.json(await financialService.getSnapshot(resolveTenantId(req)))));
apiV1Router.get("/analytics/funnel", asyncHandler(async (_req, res) => res.json((await analyticsService.getDashboard()).funnel)));

apiV1Router.post("/deals/:id/proposal", validateSchema({ params: dealIdParamsSchema, body: proposalBodySchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const result = await dealService.generateProposal(tenant, req.params.id, req.body);
  logDomainEvent("deal.proposal.generated", { tenantId: tenant, dealId: req.params.id, templateId: req.body.templateId });
  res.status(202).json({ schemaVersion: "v1", ...result });
}));

apiV1Router.get("/deals/:id/forecast", validateSchema({ params: dealIdParamsSchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const forecast = await dealService.getForecast(tenant, req.params.id);
  logDomainEvent("deal.forecast.fetched", { tenantId: tenant, dealId: req.params.id, confidence: forecast.confidence });
  res.json({ schemaVersion: "v1", ...forecast });
}));

apiV1Router.get("/customers/:id/health", validateSchema({ params: customerIdParamsSchema }), asyncHandler(async (req, res) => {
  const customers = await customerService.listHealthScore(resolveTenantId(req));
  const customer = customers.find((item) => item.id === req.params.id);
  if (!customer) throw new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found", { id: req.params.id });
  res.json(customer);
}));

apiV1Router.get("/customers/:id/timeline", validateSchema({ params: customerIdParamsSchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const events = await customerService.getTimeline(tenant, req.params.id);
  logDomainEvent("customer.timeline.fetched", { tenantId: tenant, customerId: req.params.id, events: events.length });
  res.json({ schemaVersion: "v1", events });
}));
apiV1Router.post("/customers/:id/nps", validateSchema({ params: customerIdParamsSchema, body: customerNpsBodySchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  await customerService.submitNps(tenant, req.params.id, req.body.score, req.body.feedback);
  logDomainEvent("customer.nps.submitted", { tenantId: tenant, customerId: req.params.id, score: req.body.score });
  res.status(202).json({ schemaVersion: "v1", accepted: true });
}));

apiV1Router.get("/financial/cashflow", asyncHandler(async (req, res) => res.json(await financialService.getSnapshot(resolveTenantId(req)))));
apiV1Router.get("/financial/commissions", (_req, res) => res.json({ commissions: [] }));
apiV1Router.get("/financial/invoices", validateSchema({ query: commonCursorQuerySchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const invoices = await financialService.listInvoices(tenant, req.query.cursor as string | undefined, req.query.limit as number | undefined);
  res.json({ schemaVersion: "v1", data: invoices });
}));

apiV1Router.delete("/financial/invoices/:id", validateSchema({ params: invoiceIdParamsSchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const deleted = await financialService.deleteInvoice(tenant, req.params.id);
  if (!deleted) throw new HttpError(404, "INVOICE_NOT_FOUND", "Invoice not found", { invoiceId: req.params.id });
  res.status(204).send();
}));

apiV1Router.post("/financial/reconcile", requireAuthorization({ roles: ["admin", "finance_manager"] }), validateSchema({ body: financialReconcileBodySchema }), auditTrailMiddleware("financial.reconcile"), asyncHandler(async (req, res) => {
  const payload = { ...req.body, schemaVersion: "v1" };
  if (!isFinancialReconcileInput(payload)) throw new HttpError(400, "INVALID_FINANCIAL_RECONCILE_INPUT", "Invalid reconcile payload");

  const result = await paymentService.reconcilePayment({
    customerId: payload.customerId,
    amountCents: payload.amountCents,
    currency: payload.currency,
  });

  res.status(202).json({ schemaVersion: "v1", status: "accepted", provider: result.provider, chargeId: result.chargeId });
}));

apiV1Router.get("/contracts", validateSchema({ query: contractsListQuerySchema }), asyncHandler(async (req, res) => {
  const tenant = resolveTenantId(req);
  const contracts = await contractService.list(tenant, req.query.cursor as string | undefined, req.query.limit as number | undefined, {
    customerId: req.query.customerId as string | undefined,
    dealId: req.query.dealId as string | undefined,
    status: req.query.status as never,
  });
  res.json({ schemaVersion: "v1", data: contracts });
}));

apiV1Router.post("/contracts", validateSchema({ body: createContractBodySchema }), asyncHandler(async (req, res) => {
  const contract = await contractService.create(resolveTenantId(req), req.body.customerId, req.body.documentUrl, req.body.dealId);
  res.status(201).json(contract);
}));
apiV1Router.patch("/contracts/:id/version", validateSchema({ params: customerIdParamsSchema, body: updateContractVersionBodySchema }), asyncHandler(async (req, res) => res.json(await contractService.addVersion(resolveTenantId(req), req.params.id, req.body.documentUrl))));
apiV1Router.patch("/contracts/:id/status", requireAuthorization({ scopes: ["contracts:write"] }), validateSchema({ params: customerIdParamsSchema, body: updateContractStatusBodySchema }), auditTrailMiddleware("contracts.update_status"), asyncHandler(async (req, res) => res.json(await contractService.updateSignatureStatus(resolveTenantId(req), req.params.id, req.body.status))));
apiV1Router.get("/contracts/:id", validateSchema({ params: customerIdParamsSchema }), asyncHandler(async (req, res) => res.json(await contractService.getById(resolveTenantId(req), req.params.id))));
apiV1Router.get("/contracts/:id/status", validateSchema({ params: customerIdParamsSchema }), asyncHandler(async (req, res) => {
  const contract = await contractService.getById(resolveTenantId(req), req.params.id);
  res.json({ id: contract.id, status: contract.status });
}));

apiV1Router.get("/analytics/attribution", asyncHandler(async (_req, res) => res.json((await analyticsService.getDashboard()).attribution)));

router.post("/webhooks/stripe", payloadLimitMiddleware({ maxBytes: 256 * 1024, code: "WEBHOOK_STRIPE_PAYLOAD_TOO_LARGE" }), webhookIdempotencyMiddleware({ headerCandidates: ["x-idempotency-key"] }), webhookSignatureMiddleware({ provider: "stripe", secretEnvVar: "STRIPE_WEBHOOK_SECRET", signatureHeader: "stripe-signature" }), (req, res) => { logDomainEvent("webhook.received", { provider: "stripe", tenantId: req.header("x-tenant-id") ?? "n/a" }); res.json({ schemaVersion: "v1", status: "accepted", provider: "stripe" }); });
router.post("/webhooks/docusign", payloadLimitMiddleware({ maxBytes: 256 * 1024, code: "WEBHOOK_DOCUSIGN_PAYLOAD_TOO_LARGE" }), webhookIdempotencyMiddleware({ headerCandidates: ["x-idempotency-key", "x-docusign-delivery-id"] }), webhookSignatureMiddleware({ provider: "docusign", secretEnvVar: "DOCUSIGN_WEBHOOK_SECRET", signatureHeader: "authorization", mode: "jwt" }), (req, res) => { logDomainEvent("webhook.received", { provider: "docusign", tenantId: req.header("x-tenant-id") ?? "n/a" }); res.json({ schemaVersion: "v1", status: "accepted", provider: "docusign" }); });
router.post("/webhooks/clicksign", payloadLimitMiddleware({ maxBytes: 256 * 1024, code: "WEBHOOK_CLICKSIGN_PAYLOAD_TOO_LARGE" }), webhookIdempotencyMiddleware({ headerCandidates: ["x-idempotency-key", "x-clicksign-event-id"] }), webhookSignatureMiddleware({ provider: "clicksign", secretEnvVar: "CLICKSIGN_WEBHOOK_SECRET", signatureHeader: "x-clicksign-signature" }), (req, res) => { logDomainEvent("webhook.received", { provider: "clicksign", tenantId: req.header("x-tenant-id") ?? "n/a" }); res.json({ schemaVersion: "v1", status: "accepted", provider: "clicksign" }); });
router.post("/webhooks/focus-nfe", payloadLimitMiddleware({ maxBytes: 256 * 1024, code: "WEBHOOK_FOCUS_NFE_PAYLOAD_TOO_LARGE" }), webhookIdempotencyMiddleware({ headerCandidates: ["x-idempotency-key", "x-focus-event-id"] }), webhookSignatureMiddleware({ provider: "focus-nfe", secretEnvVar: "FOCUS_NFE_WEBHOOK_SECRET", signatureHeader: "x-focus-signature" }), (req, res) => { logDomainEvent("webhook.received", { provider: "focus-nfe", tenantId: req.header("x-tenant-id") ?? "n/a" }); res.json({ schemaVersion: "v1", status: "accepted", provider: "focus-nfe" }); });
router.post("/webhooks/meta-ads", payloadLimitMiddleware({ maxBytes: 256 * 1024, code: "WEBHOOK_META_ADS_PAYLOAD_TOO_LARGE" }), webhookIdempotencyMiddleware({ headerCandidates: ["x-meta-event-id", "idempotency-key"] }), webhookSignatureMiddleware({ provider: "meta-ads", secretEnvVar: "META_ADS_WEBHOOK_SECRET", signatureHeader: "x-hub-signature-256" }), (req, res) => { logDomainEvent("webhook.received", { provider: "meta-ads", tenantId: req.header("x-tenant-id") ?? "n/a" }); res.json({ schemaVersion: "v1", status: "accepted", provider: "meta-ads" }); });
