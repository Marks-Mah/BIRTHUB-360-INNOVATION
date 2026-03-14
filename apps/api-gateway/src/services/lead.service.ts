import { LeadRepository } from '../repositories/lead.repository';
import { LeadInput } from '@birthub/shared-types';
import { NotFoundError } from '@birthub/utils/src/errors';

export class LeadService {
  private repository: LeadRepository;

  constructor() {
    this.repository = new LeadRepository();
  }

  async getAllLeads(tenantId: string) {
    return this.repository.findAll(tenantId);
  }

  async getLeadById(id: string, tenantId: string) {
    const lead = await this.repository.findById(id, tenantId);
    if (!lead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  async createLead(data: LeadInput, tenantId: string) {
    // Add validation or business logic here
    return this.repository.create(data, tenantId);
  }

  async updateLead(id: string, data: Partial<LeadInput>, tenantId: string) {
    return this.repository.update(id, data, tenantId);
  }

  async deleteLead(id: string, tenantId: string) {
    return this.repository.delete(id, tenantId);
  }
}
