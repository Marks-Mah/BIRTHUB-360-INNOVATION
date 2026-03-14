import assert from "node:assert/strict";
import test from "node:test";

import { ContractRepository } from "../../repositories/contract-repository.js";
import { DealRepository } from "../../repositories/deal-repository.js";
import { DealService } from "../deal-service.js";

test("DealService bloqueia WON sem contrato assinado", async () => {
  const dealRepo = new DealRepository();
  const contractRepo = new ContractRepository();
  const service = new DealService(dealRepo, contractRepo);

  const deal = await dealRepo.create("tenant-a", { title: "Enterprise", amount: 1000, stage: "NEW" });
  await service.moveStage("tenant-a", deal.id, "QUALIFIED");
  await service.moveStage("tenant-a", deal.id, "PROPOSAL");
  await service.moveStage("tenant-a", deal.id, "NEGOTIATION");

  await assert.rejects(() => service.moveStage("tenant-a", deal.id, "WON"));
});

test("DealService permite WON com contrato assinado no mesmo tenant", async () => {
  const dealRepo = new DealRepository();
  const contractRepo = new ContractRepository();
  const service = new DealService(dealRepo, contractRepo);

  const deal = await dealRepo.create("tenant-a", { title: "Enterprise", amount: 1000, stage: "NEW" });
  await service.moveStage("tenant-a", deal.id, "QUALIFIED");
  await service.moveStage("tenant-a", deal.id, "PROPOSAL");
  await service.moveStage("tenant-a", deal.id, "NEGOTIATION");

  const contract = await contractRepo.create("tenant-a", "cust_1", "https://docs/proposal.pdf", deal.id);
  await contractRepo.updateSignatureStatus("tenant-a", contract.id, "SIGNED");

  const updated = await service.moveStage("tenant-a", deal.id, "WON");
  assert.equal(updated.stage, "WON");
});

test("DealService não usa contrato assinado de outro tenant", async () => {
  const dealRepo = new DealRepository();
  const contractRepo = new ContractRepository();
  const service = new DealService(dealRepo, contractRepo);

  const deal = await dealRepo.create("tenant-a", { title: "Enterprise", amount: 1000, stage: "NEW" });
  await service.moveStage("tenant-a", deal.id, "QUALIFIED");
  await service.moveStage("tenant-a", deal.id, "PROPOSAL");
  await service.moveStage("tenant-a", deal.id, "NEGOTIATION");

  const foreignContract = await contractRepo.create("tenant-b", "cust_1", "https://docs/proposal.pdf", deal.id);
  await contractRepo.updateSignatureStatus("tenant-b", foreignContract.id, "SIGNED");

  await assert.rejects(() => service.moveStage("tenant-a", deal.id, "WON"));
});


test("DealService gera proposta e consulta forecast", async () => {
  const dealRepo = new DealRepository();
  const contractRepo = new ContractRepository();
  const service = new DealService(dealRepo, contractRepo);

  const deal = await dealRepo.create("tenant-a", { title: "Proposal", amount: 2000, stage: "PROPOSAL" });

  const proposal = await service.generateProposal("tenant-a", deal.id, { templateId: "tpl-pro", expirationDays: 20 });
  assert.equal(proposal.status, "generated");

  const forecast = await service.getForecast("tenant-a", deal.id);
  assert.equal(forecast.confidence, 65);
});
