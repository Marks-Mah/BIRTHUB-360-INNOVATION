import { HttpError } from "../errors/http-error.js";
import { ContractRepository } from "../repositories/contract-repository.js";
import { DealForecast, DealRepository, DealStage } from "../repositories/deal-repository.js";

export interface ProposalGenerationResult {
  dealId: string;
  tenantId: string;
  status: "generated";
  templateId: string;
  expirationDays: number;
}

export class DealService {
  constructor(
    private readonly dealRepository: DealRepository,
    private readonly contractRepository: ContractRepository,
  ) {}

  async moveStage(tenantId: string, dealId: string, stage: DealStage) {
    if (stage === "WON") {
      const contract = await this.contractRepository.findByDealId(tenantId, dealId);
      if (!contract || contract.status !== "SIGNED") {
        throw new HttpError(
          409,
          "DEAL_MISSING_SIGNED_CONTRACT",
          "Não é possível fechar deal sem proposta/contrato assinado.",
          { dealId, tenantId },
        );
      }
    }

    return this.dealRepository.updateStage(tenantId, dealId, stage);
  }

  async generateProposal(
    tenantId: string,
    dealId: string,
    input: { templateId: string; expirationDays: number },
  ): Promise<ProposalGenerationResult> {
    await this.dealRepository.markProposalGenerated(tenantId, dealId);

    return {
      dealId,
      tenantId,
      status: "generated",
      templateId: input.templateId,
      expirationDays: input.expirationDays,
    };
  }

  async getForecast(tenantId: string, dealId: string): Promise<DealForecast> {
    return this.dealRepository.getForecast(tenantId, dealId);
  }
}
