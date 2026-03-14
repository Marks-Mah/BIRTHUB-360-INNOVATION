export interface ProposalInput {
  dealId: string;
  templateId?: string;
  expiresInDays?: number;
}

export interface Proposal {
  id: string;
  dealId: string;
  url: string;
  status: "DRAFT" | "SENT";
  createdAt: string;
}

export class ProposalService {
  async generateProposal(input: ProposalInput): Promise<Proposal> {
    // Mocked PDF generation logic
    const id = `prop_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      dealId: input.dealId,
      url: `https://storage.birthub.com/proposals/${id}.pdf`,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
  }
}
