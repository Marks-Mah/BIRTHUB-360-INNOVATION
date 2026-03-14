import assert from "node:assert/strict";
import test from "node:test";
import {
  commonCursorQuerySchema,
  contractsListQuerySchema,
  dealsListQuerySchema,
  invoiceIdParamsSchema,
} from "../pagination-schemas.js";

test("commonCursorQuerySchema valida limit", () => {
  assert.equal(commonCursorQuerySchema({ limit: "10" }).success, true);
  assert.equal(commonCursorQuerySchema({ limit: "101" }).success, false);
});

test("dealsListQuerySchema valida stage e range", () => {
  assert.equal(dealsListQuerySchema({ stage: "NEW", minAmount: "10", maxAmount: "100" }).success, true);
  assert.equal(dealsListQuerySchema({ stage: "BAD" }).success, false);
  assert.equal(dealsListQuerySchema({ minAmount: "100", maxAmount: "10" }).success, false);
});

test("contractsListQuerySchema valida status", () => {
  assert.equal(contractsListQuerySchema({ status: "SIGNED", customerId: "cust_1" }).success, true);
  assert.equal(contractsListQuerySchema({ status: "BAD" }).success, false);
});

test("invoiceIdParamsSchema valida id", () => {
  assert.equal(invoiceIdParamsSchema({ id: "inv_1" }).success, true);
  assert.equal(invoiceIdParamsSchema({ id: "" }).success, false);
});
