import assert from "node:assert/strict";
import test from "node:test";
import { LeadNotFoundError } from "../../errors/lead-errors.js";
import { LeadRepository } from "../../repositories/lead-repository.js";
import { LeadService } from "../lead-service.js";

test("LeadService lança LeadNotFoundError para id inexistente", async () => {
  const service = new LeadService(new LeadRepository({ persistenceEnabled: false }));

  await assert.rejects(() => service.getLeadById("public", "inexistente"), (error: unknown) => {
    assert.ok(error instanceof LeadNotFoundError);
    assert.equal((error as LeadNotFoundError).code, "LEAD_001");
    return true;
  });
});

test("LeadService atualiza e remove lead existente", async () => {
  const repository = new LeadRepository({ persistenceEnabled: false });
  const created = await repository.create("public", {
    name: "Fabio Nunes",
    email: "fabio@acme.com",
    assignee: "sdr-11",
    score: 50,
    status: "NEW",
  });
  const service = new LeadService(repository);

  const updated = await service.updateLead("public", created.id, { status: "CONTACTED", score: 88 });
  assert.equal(updated.status, "CONTACTED");
  assert.equal(updated.score, 88);

  await service.deleteLead("public", created.id);

  await assert.rejects(() => service.getLeadById("public", created.id), (error: unknown) => {
    assert.ok(error instanceof LeadNotFoundError);
    return true;
  });
});


test("LeadService enfileira enrich e outreach para lead existente", async () => {
  const repository = new LeadRepository();
  const service = new LeadService(repository);

  const created = await repository.create("tenant-a", {
    name: "Kai",
    email: "kai@acme.com",
    status: "NEW",
    score: 55,
    assignee: "sdr-22",
  });

  const enrich = await service.enqueueEnrichment("tenant-a", created.id, { source: "manual", forceRefresh: true });
  assert.equal(enrich.status, "queued");
  assert.equal(enrich.forceRefresh, true);

  const outreach = await service.enqueueOutreach("tenant-a", created.id, { channel: "email", cadenceId: "cad-1" });
  assert.equal(outreach.status, "queued");
  assert.equal(outreach.channel, "email");
});