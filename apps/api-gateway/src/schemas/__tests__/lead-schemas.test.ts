import assert from "node:assert/strict";
import test from "node:test";
import {
  createLeadBodySchema,
  listLeadsQuerySchema,
  updateLeadStatusBodySchema,
} from "../lead-schemas.js";

test("createLeadBodySchema valida payload válido", () => {
  const parsed = createLeadBodySchema({
    name: "Ana Silva",
    email: "ana@acme.com",
    status: "NEW",
    score: 80,
    assignee: "sdr-01",
  });

  assert.equal(parsed.success, true);
});

test("createLeadBodySchema rejeita payload inválido", () => {
  const parsed = createLeadBodySchema({
    name: "A",
    email: "email-invalido",
    status: "NOPE",
    score: 150,
    assignee: "x",
  });

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.errors.length >= 4);
  }
});

test("updateLeadStatusBodySchema rejeita status inválido", () => {
  const parsed = updateLeadStatusBodySchema({ status: "BAD" });
  assert.equal(parsed.success, false);
});

test("listLeadsQuerySchema aplica coerção e valida range", () => {
  const parsed = listLeadsQuerySchema({ limit: "10", minScore: "70", sortOrder: "desc" });
  assert.equal(parsed.success, true);

  const invalid = listLeadsQuerySchema({ limit: "500" });
  assert.equal(invalid.success, false);
});
