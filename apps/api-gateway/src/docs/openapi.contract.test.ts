import assert from "node:assert/strict";
import test from "node:test";

import { openApiDocument } from "./openapi.js";

void test("OpenAPI exposes the supported gateway surface", () => {
  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  const supported = [
    "/api/v1/leads",
    "/api/v1/internal/organizations/{id}/plan",
    "/api/v1/internal/activities/{id}"
  ];

  for (const path of supported) {
    assert.ok(paths[path], `Missing path ${path}`);
  }
});

void test("OpenAPI applies bearer security to the supported routes", () => {
  const leadPost = (openApiDocument.paths as Record<string, Record<string, any>>)["/api/v1/leads"].post;
  const organizationPlanPatch =
    (openApiDocument.paths as Record<string, Record<string, any>>)[
      "/api/v1/internal/organizations/{id}/plan"
    ].patch;
  const activityGet =
    (openApiDocument.paths as Record<string, Record<string, any>>)[
      "/api/v1/internal/activities/{id}"
    ].get;

  assert.ok(Array.isArray(leadPost.security) && leadPost.security.length > 0);
  assert.ok(Array.isArray(organizationPlanPatch.security) && organizationPlanPatch.security.length > 0);
  assert.ok(Array.isArray(activityGet.security) && activityGet.security.length > 0);
});
