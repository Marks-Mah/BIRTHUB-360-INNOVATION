import assert from "node:assert/strict";
import test from "node:test";

import {
  CyclicDependencyError,
  InvalidGraphError,
  validateDag
} from "../src/index.js";

test("DAG validator rejects cyclic graph A->B->A", () => {
  assert.throws(
    () =>
      validateDag({
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "A" }
        ],
        nodes: [{ id: "A" }, { id: "B" }]
      }),
    CyclicDependencyError
  );
});

test("DAG validator rejects self-loop graph", () => {
  assert.throws(
    () =>
      validateDag({
        edges: [{ source: "A", target: "A" }],
        nodes: [{ id: "A" }]
      }),
    CyclicDependencyError
  );
});

test("DAG validator rejects graph with isolated node", () => {
  assert.throws(
    () =>
      validateDag({
        edges: [{ source: "A", target: "B" }],
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }]
      }),
    InvalidGraphError
  );
});

test("DAG validator rejects graph with multiple triggers/roots", () => {
  assert.throws(
    () =>
      validateDag({
        edges: [{ source: "A", target: "C" }, { source: "B", target: "C" }],
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }]
      }),
    InvalidGraphError
  );
});

test("DAG validator rejects graph with dangling edges", () => {
  assert.throws(
    () =>
      validateDag({
        edges: [{ source: "A", target: "B" }],
        nodes: [{ id: "A" }]
      }),
    InvalidGraphError
  );
});

