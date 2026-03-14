import test from "node:test";
import assert from "node:assert/strict";
import { buildCspHeader, createRateLimiter, sanitizeHtml, scanSecrets } from "../../index.js";

test("sanitize removes script", () => {
  assert.equal(sanitizeHtml('<p>ok</p><script>alert(1)</script>'), '<p>ok</p>');
});

test("rate limiter blocks overflow", () => {
  const limiter = createRateLimiter(2, 1000);
  assert.equal(limiter("a"), true);
  assert.equal(limiter("a"), true);
  assert.equal(limiter("a"), false);
});

test("secret scanner catches keys", () => {
  assert.throws(() => scanSecrets("token AKIA1234567890ABCDEF"));
});

test("csp builder outputs directives", () => {
  const csp = buildCspHeader({ "default-src": ["'self'"], "img-src": ["'self'", "data:"] });
  assert.match(csp, /default-src/);
});

test("secret scanner passes clean text", () => {
  assert.doesNotThrow(() => scanSecrets("safe content"));
});
