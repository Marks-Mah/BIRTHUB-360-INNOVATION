import assert from "node:assert/strict";
import test from "node:test";
import { DealRepository } from "../deal-repository.js";

test("DealRepository aplica transição válida e registra histórico", async () => {
  const repository = new DealRepository();
  const deal = await repository.create("tenant-a", { title: "ACME", amount: 1000, stage: "NEW" });

  const updated = await repository.updateStage("tenant-a", deal.id, "QUALIFIED");
  assert.equal(updated.stage, "QUALIFIED");

  const history = await repository.getHistory("tenant-a", deal.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].from, "NEW");
  assert.equal(history[0].to, "QUALIFIED");
});

test("DealRepository bloqueia transição inválida", async () => {
  const repository = new DealRepository();
  const deal = await repository.create("tenant-a", { title: "ACME", amount: 1000, stage: "NEW" });

  await assert.rejects(() => repository.updateStage("tenant-a", deal.id, "WON"));
});


test("DealRepository gera forecast e marca proposta", async () => {
  const repository = new DealRepository();
  const deal = await repository.create("tenant-a", { title: "Forecast", amount: 5000, stage: "PROPOSAL" });

  const withProposal = await repository.markProposalGenerated("tenant-a", deal.id);
  assert.equal(withProposal.proposalSigned, true);

  const forecast = await repository.getForecast("tenant-a", deal.id);
  assert.equal(forecast.tenantId, "tenant-a");
  assert.equal(forecast.confidence, 65);
  assert.equal(forecast.projectedRevenue, 3250);
});
