export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export type AgentRole =
  | 'marketing'
  | 'ldr'
  | 'sdr'
  | 'ae'
  | 'pos-venda'
  | 'analista'
  | 'financeiro'
  | 'juridico';

// Enums
export enum Plan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CMO = 'CMO',
  HEAD_MARKETING = 'HEAD_MARKETING',
  SDR = 'SDR',
  AE = 'AE',
  CS_MANAGER = 'CS_MANAGER',
  FINANCIAL = 'FINANCIAL',
  LEGAL = 'LEGAL',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
}

export enum LeadStatus {
  NEW = 'NEW',
  ENRICHING = 'ENRICHING',
  QUALIFIED = 'QUALIFIED',
  DISQUALIFIED = 'DISQUALIFIED',
  CONTACTED = 'CONTACTED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  IN_NEGOTIATION = 'IN_NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
  NURTURING = 'NURTURING',
}

export enum DealStage {
  PROSPECTING = 'PROSPECTING',
  QUALIFICATION = 'QUALIFICATION',
  DEMO_SCHEDULED = 'DEMO_SCHEDULED',
  DEMO_DONE = 'DEMO_DONE',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATION = 'NEGOTIATION',
  CONTRACT_REVIEW = 'CONTRACT_REVIEW',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  PARTIALLY_SIGNED = 'PARTIALLY_SIGNED',
  SIGNED = 'SIGNED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  IN_DUNNING = 'IN_DUNNING',
  CANCELLED = 'CANCELLED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export enum ActivityType {
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_OPENED = 'EMAIL_OPENED',
  EMAIL_REPLIED = 'EMAIL_REPLIED',
  CALL_MADE = 'CALL_MADE',
  CALL_ANSWERED = 'CALL_ANSWERED',
  WHATSAPP_SENT = 'WHATSAPP_SENT',
  WHATSAPP_REPLIED = 'WHATSAPP_REPLIED',
  LINKEDIN_INMAIL = 'LINKEDIN_INMAIL',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_COMPLETED = 'MEETING_COMPLETED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  CONTRACT_SENT = 'CONTRACT_SENT',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NPS_COLLECTED = 'NPS_COLLECTED',
  HEALTH_ALERT = 'HEALTH_ALERT',
  UPSELL_TRIGGERED = 'UPSELL_TRIGGERED',
  AGENT_ACTION = 'AGENT_ACTION',
}

export enum QueueName {
  // Agent Queues
  SDR_QUEUE = "SDR_QUEUE",
  LDR_QUEUE = "LDR_QUEUE",
  AE_QUEUE = "AE_QUEUE",
  ANALISTA_QUEUE = "ANALISTA_QUEUE",
  FINANCEIRO_QUEUE = "FINANCEIRO_QUEUE",
  JURIDICO_QUEUE = "JURIDICO_QUEUE",
  MARKETING_QUEUE = "MARKETING_QUEUE",
  POS_VENDA_QUEUE = "POS_VENDA_QUEUE",
  BDR_QUEUE = "BDR_QUEUE",
  CLOSER_QUEUE = "CLOSER_QUEUE",
  SALES_OPS_QUEUE = "SALES_OPS_QUEUE",
  ENABLEMENT_QUEUE = "ENABLEMENT_QUEUE",
  KAM_QUEUE = "KAM_QUEUE",
  PARTNERS_QUEUE = "PARTNERS_QUEUE",
  FIELD_QUEUE = "FIELD_QUEUE",
  PRE_SALES_QUEUE = "PRE_SALES_QUEUE",
  COPYWRITER_QUEUE = "COPYWRITER_QUEUE",
  SOCIAL_QUEUE = "SOCIAL_QUEUE",

  // Task Queues
  LEAD_ENRICHMENT = "LEAD_ENRICHMENT",
  DEAL_CLOSED_WON = "DEAL_CLOSED_WON",
  HEALTH_ALERT = "HEALTH_ALERT",
  CHURN_RISK_HIGH = "CHURN_RISK_HIGH",
  HEALTH_SCORE_UPDATE = "HEALTH_SCORE_UPDATE",
  EMAIL_CADENCE_SEND = "EMAIL_CADENCE_SEND",
  INVOICE_GENERATE = "INVOICE_GENERATE",
  NPS_ANALYSIS = "NPS_ANALYSIS",
  CONTRACT_ANALYSIS = "CONTRACT_ANALYSIS",
  BANK_RECONCILIATION = "BANK_RECONCILIATION",
  COMMISSION_CALC = "COMMISSION_CALC",
  BOARD_REPORT = "BOARD_REPORT",
  CONTRACT_DEADLINES = "CONTRACT_DEADLINES",
  DOMAIN_WARMUP = "DOMAIN_WARMUP",
}

// Interfaces

export interface Organization {
  id: string;
  name: string;
  cnpj?: string | null;
  plan: Plan;
  createdAt: Date;
  updatedAt?: Date; // Usually managed by DB but useful for frontend
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone?: string | null;
  linkedin?: string | null;
  company: string;
  jobTitle?: string | null;
  icpScore: number;
  icpTier?: string | null;
  intentScore: number;
  techStack?: any | null; // Json
  orgChart?: any | null; // Json
  financialData?: any | null; // Json
  intentSignals?: any | null; // Json
  emailValid: boolean;
  emailStatus?: string | null;
  status: LeadStatus;
  source?: string | null;
  utmData?: any | null; // Json
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  organizationId: string;
  leadId: string;
  assignedAEId?: string | null;
  assignedSDRId?: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  forecastCategory?: string | null;
  expectedCloseDate?: Date | null;
  actualCloseDate?: Date | null;
  products?: any | null; // Json
  discountPct: number;
  finalValue?: number | null;
  competitors?: any | null; // Json
  stakeholders?: any | null; // Json
  objections?: any | null; // Json
  callNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  leadId?: string | null;
  dealId?: string | null;
  agentId: string;
  type: ActivityType;
  channel?: string | null;
  content: any; // Json
  outcome?: string | null;
  createdAt: Date;
}

export interface EmailCadence {
  id: string;
  leadId: string;
  step: number;
  channel: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  openedAt?: Date | null;
  repliedAt?: Date | null;
  status: string;
  subject: string;
  body: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  organizationId: string;
  leadId: string;
  dealId: string;
  healthScore: number;
  healthStatus: string;
  lastLoginAt?: Date | null;
  loginFrequency?: number | null;
  featureAdoption?: any | null; // Json
  supportSentiment?: string | null;
  mrr: number;
  planId: string;
  contractStart: Date;
  contractEnd: Date;
  npsScore?: number | null;
  npsCategory?: string | null;
  npsComment?: string | null;
  churnRisk: number;
  churnReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  dealId: string;
  customerId?: string | null;
  type: string;
  status: ContractStatus;
  content?: string | null;
  fileUrl?: string | null;
  version: number;
  riskScore?: number | null;
  redFlags?: any | null; // Json
  summary?: string | null;
  docusignId?: string | null;
  clicksignId?: string | null;
  signatories?: any | null; // Json
  signedAt?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  renewalDate?: Date | null;
  kycStatus?: string | null;
  kycData?: any | null; // Json
  amlStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date | null;
  status: InvoiceStatus;
  dunningStep: number;
  dunningLastAt?: Date | null;
  nfeKey?: string | null;
  nfeStatus?: string | null;
  nfeUrl?: string | null;
  gateway?: string | null;
  gatewayId?: string | null;
  paymentMethod?: string | null;
  reconciledAt?: Date | null;
  bankReference?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string | null;
  resolvedAt?: Date | null;
  sentiment?: string | null;
  createdAt: Date;
}

export interface Commission {
  id: string;
  userId: string;
  dealId: string;
  period: string;
  baseAmount: number;
  rate: number;
  finalAmount: number;
  type: string;
  clawbackAt?: Date | null;
  paidAt?: Date | null;
  status: string;
  createdAt: Date;
}

export interface AgentLog {
  id: string;
  agentName: string;
  jobId?: string | null;
  action: string;
  input?: any | null; // Json
  output?: any | null; // Json
  tokensIn?: number | null;
  tokensOut?: number | null;
  durationMs?: number | null;
  error?: string | null;
  createdAt: Date;
}

export * from './schemas/leads';
