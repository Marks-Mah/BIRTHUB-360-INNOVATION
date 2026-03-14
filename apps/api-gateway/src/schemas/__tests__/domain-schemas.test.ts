import assert from "node:assert/strict";
import test from "node:test";
import {
  createContractBodySchema,
  createDealBodySchema,
  customerNpsBodySchema,
  customerIdParamsSchema,
  financialReconcileBodySchema,
  updateContractStatusBodySchema,
  updateContractVersionBodySchema,
  updateDealStageBodySchema,
} from "../domain-schemas.js";

test("createDealBodySchema valida título e amount", () => {
  assert.equal(createDealBodySchema({ title: "Deal", amount: 1000 }).success, true);
  assert.equal(createDealBodySchema({ title: "D", amount: -1 }).success, false);
});

test("updateDealStageBodySchema valida stage", () => {
  assert.equal(updateDealStageBodySchema({ stage: "QUALIFIED" }).success, true);
  assert.equal(updateDealStageBodySchema({ stage: "INVALID" }).success, false);
});

test("createContractBodySchema valida URL", () => {
  assert.equal(createContractBodySchema({ customerId: "cust_1", documentUrl: "https://docs/acme.pdf" }).success, true);
  assert.equal(createContractBodySchema({ customerId: "cust_1", documentUrl: "ftp://bad" }).success, false);
});

test("updateContractVersionBodySchema e status validam payload", () => {
  assert.equal(updateContractVersionBodySchema({ documentUrl: "https://docs/v2.pdf" }).success, true);
  assert.equal(updateContractVersionBodySchema({ documentUrl: "invalid" }).success, false);
  assert.equal(updateContractStatusBodySchema({ status: "SIGNED" }).success, true);
  assert.equal(updateContractStatusBodySchema({ status: "WRONG" }).success, false);
});

test("financialReconcileBodySchema valida moeda e amount", () => {
  assert.equal(financialReconcileBodySchema({ customerId: "cust_1", amountCents: 1200, currency: "BRL" }).success, true);
  assert.equal(financialReconcileBodySchema({ customerId: "", amountCents: 0, currency: "EUR" }).success, false);
});

test("customer schemas validam params e nps", () => {
  assert.equal(customerIdParamsSchema({ id: "cust_1" }).success, true);
  assert.equal(customerIdParamsSchema({ id: " " }).success, false);
  assert.equal(customerNpsBodySchema({ score: 9, feedback: "ótimo" }).success, true);
  assert.equal(customerNpsBodySchema({ score: 11 }).success, false);
});
