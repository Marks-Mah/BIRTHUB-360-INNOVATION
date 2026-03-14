import test from "node:test";
import assert from "node:assert/strict";
import { sanitize } from "../lib/sanitize.ts";

test("remove script tag", () => {
  assert.equal(sanitize('<p>ok</p><script>alert(1)</script>'), '<p>ok</p>');
});

test("remove onerror attr", () => {
  const out = sanitize('<img src=x onerror=alert(1)><p>ok</p>');
  assert.equal(out.includes("onerror"), false);
});

test("remove javascript uri", () => {
  const out = sanitize('<a href="javascript:alert(1)">x</a>');
  assert.equal(out.includes("javascript:"), false);
});