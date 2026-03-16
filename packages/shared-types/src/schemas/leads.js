import { z } from 'zod';
export const LeadSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    company: z.string().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'lost']).default('new'),
});
export var QueueName;
(function (QueueName) {
    QueueName["LDR_QUEUE"] = "ldr-queue";
    QueueName["SDR_QUEUE"] = "sdr-queue";
    QueueName["AE_QUEUE"] = "ae-queue";
    QueueName["MARKETING_QUEUE"] = "marketing-queue";
    QueueName["FINANCE_QUEUE"] = "finance-queue";
    QueueName["FINANCEIRO_QUEUE"] = "financeiro-queue";
    QueueName["LEGAL_QUEUE"] = "legal-queue";
    QueueName["JURIDICO_QUEUE"] = "juridico-queue";
    QueueName["POS_VENDA_QUEUE"] = "pos-venda-queue";
    QueueName["ANALISTA_QUEUE"] = "analista-queue";
    QueueName["PARTNERS_QUEUE"] = "partners-queue";
    QueueName["ENABLEMENT_QUEUE"] = "enablement-queue";
    QueueName["PRE_SALES_QUEUE"] = "pre-sales-queue";
    QueueName["FIELD_QUEUE"] = "field-queue";
    QueueName["SALES_OPS_QUEUE"] = "sales-ops-queue";
    QueueName["KAM_QUEUE"] = "kam-queue";
    QueueName["BDR_QUEUE"] = "bdr-queue";
    QueueName["SOCIAL_QUEUE"] = "social-queue";
    QueueName["CLOSER_QUEUE"] = "closer-queue";
    QueueName["COPYWRITER_QUEUE"] = "copywriter-queue";
    QueueName["ORCHESTRATOR_QUEUE"] = "orchestrator-queue";
    QueueName["LEAD_ENRICHMENT"] = "lead-enrichment";
    QueueName["DEAL_CLOSED_WON"] = "deal-closed-won";
    QueueName["HEALTH_ALERT"] = "health-alert";
    QueueName["CHURN_RISK_HIGH"] = "churn-risk-high";
    QueueName["HEALTH_SCORE_UPDATE"] = "health-score-update";
    QueueName["EMAIL_CADENCE_SEND"] = "email-cadence-send";
    QueueName["INVOICE_GENERATE"] = "invoice-generate";
    QueueName["NPS_ANALYSIS"] = "nps-analysis";
    QueueName["CONTRACT_ANALYSIS"] = "contract-analysis";
    QueueName["BANK_RECONCILIATION"] = "bank-reconciliation";
    QueueName["COMMISSION_CALC"] = "commission-calc";
    QueueName["BOARD_REPORT"] = "board-report";
    QueueName["CONTRACT_DEADLINES"] = "contract-deadlines";
    QueueName["DOMAIN_WARMUP"] = "domain-warmup";
})(QueueName || (QueueName = {}));
