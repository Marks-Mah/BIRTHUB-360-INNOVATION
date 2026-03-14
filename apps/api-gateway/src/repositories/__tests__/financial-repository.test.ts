import assert from "node:assert/strict";
import test from "node:test";
import { FinancialRepository } from "../financial-repository.js";

test("FinancialRepository consolida snapshot financeiro", async () => {
  const repository = new FinancialRepository();
  const snapshot = await repository.getSnapshot("tenant-a");

  assert.ok(snapshot.mrr > 0);
  assert.ok(snapshot.projectedMrr30d > 0);
  assert.ok(snapshot.churnRate > 0);
  assert.ok(snapshot.delinquencyRate > 0);
});

test("FinancialRepository lista e faz soft delete de invoice", async () => {
  const repository = new FinancialRepository();
  const invoices = await repository.listInvoices("tenant-a");
  assert.ok(invoices.length > 0);

  const deleted = await repository.softDeleteInvoice("tenant-a", invoices[0].id);
  assert.equal(deleted, true);

  const afterDelete = await repository.listInvoices("tenant-a");
  assert.equal(afterDelete.length, 0);
});
