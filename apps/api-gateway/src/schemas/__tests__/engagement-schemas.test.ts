import assert from "node:assert/strict";
import test from "node:test";
import {
  dealIdParamsSchema,
  leadEnrichmentBodySchema,
  leadOutreachBodySchema,
  proposalBodySchema,
} from "../engagement-schemas.js";

test("dealIdParamsSchema valida id", () => {
  const valid = dealIdParamsSchema({ id: "deal_1" });
  assert.equal(valid.success, true);

  const invalid = dealIdParamsSchema({ id: "  " });
  assert.equal(invalid.success, false);
});

test("leadEnrichmentBodySchema aplica defaults e valida source", () => {
  const valid = leadEnrichmentBodySchema({});
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.forceRefresh, false);
    assert.equal(valid.data.source, "manual");
  }

  const invalid = leadEnrichmentBodySchema({ source: "invalid" });
  assert.equal(invalid.success, false);
});

test("leadOutreachBodySchema valida canal", () => {
  const valid = leadOutreachBodySchema({ channel: "email", cadenceId: "cad_1" });
  assert.equal(valid.success, true);

  const invalid = leadOutreachBodySchema({ channel: "sms" });
  assert.equal(invalid.success, false);
});

test("proposalBodySchema valida template e prazo", () => {
  const valid = proposalBodySchema({ templateId: "tpl-standard", expirationDays: 15 });
  assert.equal(valid.success, true);

  const invalid = proposalBodySchema({ templateId: "", expirationDays: 0 });
  assert.equal(invalid.success, false);
});
