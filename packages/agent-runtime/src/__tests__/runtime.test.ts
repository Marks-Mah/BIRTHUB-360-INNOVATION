import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeGraph } from "../../index.js";

test("runtime graph orders dependencies", () => {
  const graph = new RuntimeGraph();
  graph.addStep({ id: "a", description: "first", dependsOn: [] });
  graph.addStep({ id: "b", description: "second", dependsOn: ["a"] });
  const ordered = graph.topologicalOrder().map((s) => s.id);
  assert.deepEqual(ordered, ["a", "b"]);
});
