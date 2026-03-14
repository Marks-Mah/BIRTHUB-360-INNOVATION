export class LeadNotFoundError extends Error {
  readonly code = "LEAD_001";

  constructor(leadId: string) {
    super(`Lead ${leadId} not found`);
    this.name = "LeadNotFoundError";
  }
}
