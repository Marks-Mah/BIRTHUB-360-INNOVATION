import assert from "node:assert/strict";
import test from "node:test";
import { ContractRepository } from "../contract-repository.js";

test("ContractRepository cria contrato, adiciona versão e atualiza status", async () => {
  const repository = new ContractRepository();
  const contract = await repository.create("tenant-a", "cust-1", "https://doc/v1", undefined);

  assert.equal(contract.versions.length, 1);
  assert.equal(contract.tenantId, "tenant-a");

  const withVersion = await repository.addVersion("tenant-a", contract.id, "https://doc/v2");
  assert.equal(withVersion.versions.length, 2);

  const signed = await repository.updateSignatureStatus("tenant-a", contract.id, "SIGNED");
  assert.equal(signed.status, "SIGNED");
});

test("ContractRepository isola contrato por tenant", async () => {
  const repository = new ContractRepository();
  const contract = await repository.create("tenant-a", "cust-1", "https://doc/v1", undefined);

  await assert.rejects(() => repository.getById("tenant-b", contract.id));
});
