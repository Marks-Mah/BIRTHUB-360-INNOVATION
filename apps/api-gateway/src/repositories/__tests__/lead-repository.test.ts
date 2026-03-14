import assert from "node:assert/strict";
import test from "node:test";
import { LeadRepository } from "../lead-repository.js";

test("LeadRepository lista com filtros e paginação por cursor", async () => {
  const repository = new LeadRepository({ persistenceEnabled: false });

  const first = await repository.create("tenant-a", {
    name: "Ana Silva",
    email: "ana@acme.com",
    assignee: "sdr-01",
    score: 81,
    status: "NEW",
  });
  await repository.create("tenant-a", {
    name: "Bruno Costa",
    email: "bruno@acme.com",
    assignee: "sdr-02",
    score: 92,
    status: "QUALIFIED",
  });
  const third = await repository.create("tenant-a", {
    name: "Carla Mendes",
    email: "carla@acme.com",
    assignee: "sdr-01",
    score: 70,
    status: "CONTACTED",
  });

  const firstPage = await repository.list({
    tenantId: "tenant-a",
    limit: 1,
    filters: { assignee: "sdr-01", minScore: 70 },
    sortBy: "score",
    sortOrder: "desc",
  });

  assert.equal(firstPage.data[0].id, first.id);
  assert.equal(firstPage.nextCursor, first.id);

  const secondPage = await repository.list({
    tenantId: "tenant-a",
    cursor: firstPage.nextCursor ?? undefined,
    limit: 1,
    filters: { assignee: "sdr-01", minScore: 70 },
    sortBy: "score",
    sortOrder: "desc",
  });

  assert.equal(secondPage.data[0].id, third.id);
  assert.equal(secondPage.nextCursor, null);
});

test("LeadRepository executa update e delete no CRUD", async () => {
  const repository = new LeadRepository({ persistenceEnabled: false });

  const created = await repository.create("tenant-a", {
    name: "Diego Lima",
    email: "diego@acme.com",
    assignee: "sdr-03",
    score: 77,
    status: "NEW",
  });

  assert.equal(created.id, "lead_0001");

  const updated = await repository.updateStatus("tenant-a", created.id, "QUALIFIED");

  assert.equal(updated?.status, "QUALIFIED");
});

test("LeadRepository executa update e delete no CRUD", async () => {
  const repository = new LeadRepository({ persistenceEnabled: false });

  const created = await repository.create("tenant-a", {
    name: "Eva Rocha",
    email: "eva@acme.com",
    assignee: "sdr-09",
    score: 80,
    status: "NEW",
  });

  const updated = await repository.update("tenant-a", created.id, {
    score: 95,
    assignee: "sdr-10",
  });

  assert.equal(updated?.score, 95);
  assert.equal(updated?.assignee, "sdr-10");

  const removed = await repository.delete("tenant-a", created.id);
  assert.equal(removed, true);

  const missing = await repository.findById("tenant-a", created.id);
  assert.equal(missing, null);
});
