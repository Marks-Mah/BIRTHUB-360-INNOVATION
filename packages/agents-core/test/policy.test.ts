import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import { PolicyDeniedError, PolicyEngine } from "../src/policy/engine.js";
import { BaseTool } from "../src/tools/baseTool.js";

class EchoTool extends BaseTool<{ value: string }, { value: string }> {
  constructor(policyEngine: PolicyEngine) {
    super(
      {
        inputSchema: z.object({ value: z.string().min(1) }).strict(),
        name: "echo",
        outputSchema: z.object({ value: z.string() }).strict()
      },
      { policyEngine }
    );
  }

  protected async execute(input: { value: string }): Promise<{ value: string }> {
    return { value: input.value };
  }
}

void test("tool execution succeeds when policy allows action", async () => {
  const engine = new PolicyEngine([
    {
      action: "tool.echo",
      effect: "allow",
      id: "allow-echo"
    }
  ]);

  const tool = new EchoTool(engine);
  const output = await tool.run(
    { value: "ok" },
    {
      agentId: "agent-1",
      tenantId: "tenant-1"
    }
  );

  assert.equal(output.value, "ok");
});

void test("tool execution throws PolicyDeniedError when action is denied", async () => {
  const engine = new PolicyEngine([
    {
      action: "tool.echo",
      effect: "deny",
      id: "deny-echo"
    }
  ]);
  const tool = new EchoTool(engine);

  await assert.rejects(
    () =>
      tool.run(
        { value: "blocked" },
        {
          agentId: "agent-1",
          tenantId: "tenant-1"
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof PolicyDeniedError);
      assert.equal(error.code, "POLICY_DENIED");
      return true;
    }
  );
});
