import { LeadNotFoundError } from "../errors/lead-errors.js";
import {
  LeadListParams,
  LeadListResult,
  LeadRecord,
  LeadRepository,
  LeadStatus,
  UpdateLeadInput,
} from "../repositories/lead-repository.js";

export interface CreateLeadInput {
  name: string;
  email: string;
  status: LeadStatus;
  score: number;
  assignee: string;
}

export interface LeadEnrichmentResult {
  leadId: string;
  tenantId: string;
  status: "queued";
  source: "manual" | "automation";
  forceRefresh: boolean;
}

export interface LeadOutreachResult {
  leadId: string;
  tenantId: string;
  status: "queued";
  channel: "email" | "linkedin" | "whatsapp";
  cadenceId?: string;
}

export class LeadService {
  constructor(private readonly leadRepository: LeadRepository) {}

  async createLead(tenantId: string, input: CreateLeadInput): Promise<LeadRecord> {
    return this.leadRepository.create(tenantId, input);
  }

  async listLeads(params: LeadListParams): Promise<LeadListResult> {
    return this.leadRepository.list(params);
  }

  async getLeadById(tenantId: string, id: string): Promise<LeadRecord> {
    const lead = await this.leadRepository.findById(tenantId, id);

    if (!lead) {
      throw new LeadNotFoundError(id);
    }

    return lead;
  }

  async updateLeadStatus(tenantId: string, id: string, status: LeadStatus): Promise<LeadRecord> {
    const lead = await this.leadRepository.updateStatus(tenantId, id, status);

    if (!lead) {
      throw new LeadNotFoundError(id);
    }

    return lead;
  }

  async updateLead(tenantId: string, id: string, input: UpdateLeadInput): Promise<LeadRecord> {
    const lead = await this.leadRepository.update(tenantId, id, input);

    if (!lead) {
      throw new LeadNotFoundError(id);
    }

    return lead;
  }

  async deleteLead(tenantId: string, id: string): Promise<void> {
    const removed = await this.leadRepository.delete(tenantId, id);

    if (!removed) {
      throw new LeadNotFoundError(id);
    }
  }

  async triggerLeadEnrichment(tenantId: string, id: string) {
    await this.getLeadById(tenantId, id);

    return {
      leadId: id,
      action: "enrichment_requested",
      status: "queued",
      queuedAt: new Date().toISOString(),
    };
  }

  async triggerLeadOutreach(tenantId: string, id: string) {
    await this.getLeadById(tenantId, id);

    return {
      leadId: id,
      action: "outreach_requested",
      status: "queued",
      queuedAt: new Date().toISOString(),
    };
  }

  async enqueueEnrichment(
    tenantId: string,
    id: string,
    input: { source: "manual" | "automation"; forceRefresh: boolean },
  ): Promise<LeadEnrichmentResult> {
    await this.getLeadById(tenantId, id);

    return {
      leadId: id,
      tenantId,
      status: "queued",
      source: input.source,
      forceRefresh: input.forceRefresh,
    };
  }

  async enqueueOutreach(
    tenantId: string,
    id: string,
    input: { channel: "email" | "linkedin" | "whatsapp"; cadenceId?: string },
  ): Promise<LeadOutreachResult> {
    await this.getLeadById(tenantId, id);

    return {
      leadId: id,
      tenantId,
      status: "queued",
      channel: input.channel,
      cadenceId: input.cadenceId,
    };
  }
}
