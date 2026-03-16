import { executeManifestAgentRuntime } from "./runtime.js";
import { Prisma, prisma } from "@birthub/database";
import { outputService } from "../../../api/src/modules/outputs/output.service.js";
import { agentMetricsService } from "../../../api/src/modules/agents/metrics.service.js";

class InMemoryRedis {
  private readonly data = new Map<string, { expiresAt?: number; value: string }>();

  async get(key: string): Promise<string | null> {
    const current = this.data.get(key);
    if (!current) {
      return null;
    }

    if (current.expiresAt !== undefined && current.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }

    return current.value;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<"OK" | null> {
    const options = args.map((arg) => String(arg).toUpperCase());
    const hasNx = options.includes("NX");
    const exIndex = options.indexOf("EX");
    const expiresAt =
      exIndex >= 0 && args[exIndex + 1] ? Date.now() + Number(args[exIndex + 1]) * 1000 : undefined;

    if (hasNx && this.data.has(key)) {
      return null;
    }

    this.data.set(key, {
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      value
    });

    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }
}

async function main(): Promise<void> {
  const executionId = process.env.RUNTIME_TEST_EXECUTION_ID;
  const agentId = process.env.RUNTIME_TEST_AGENT_ID;
  const organizationId = process.env.RUNTIME_TEST_ORGANIZATION_ID;
  const tenantId = process.env.RUNTIME_TEST_TENANT_ID;
  const userId = process.env.RUNTIME_TEST_USER_ID;

  if (!executionId || !agentId || !organizationId || !tenantId || !userId) {
    throw new Error("Runtime integration harness is missing required env vars.");
  }

  const runtimeResult = await executeManifestAgentRuntime({
    agentId,
    executionId,
    input: {
      company: "Acme Orbit",
      objective: "Avaliar sinais comerciais da conta",
      sessionId: "runtime-session-1",
      tenantId
    },
    organizationId,
    redis: new InMemoryRedis() as never,
    source: "MANUAL",
    tenantId,
    userId
  });

  await prisma.agentExecution.update({
    data: {
      completedAt: runtimeResult.status === "WAITING_APPROVAL" ? null : new Date(),
      metadata: runtimeResult.metadata as Prisma.InputJsonValue,
      output: runtimeResult.output as Prisma.InputJsonValue,
      outputHash: runtimeResult.outputHash,
      status: runtimeResult.status
    },
    where: {
      id: executionId
    }
  });

  const outputs = await outputService.listByExecution(tenantId, executionId);
  const approvedOutput =
    outputs[0] && outputs[0].status === "WAITING_APPROVAL"
      ? await outputService.approve(outputs[0].id, tenantId, userId)
      : outputs[0] ?? null;

  if (approvedOutput) {
    await prisma.agentExecution.update({
      data: {
        completedAt: new Date(),
        status: "SUCCESS"
      },
      where: {
        id: executionId
      }
    });
  }

  const metrics = await agentMetricsService.getMetrics({
    agentId,
    tenantId,
    windowMinutes: 60
  });
  const [memoryEntryCount, learningPublishedCount, budgetEvents, persistedExecution] =
    await Promise.all([
      prisma.auditLog.count({
        where: {
          action: "AGENT_MEMORY_SET",
          tenantId
        }
      }),
      prisma.auditLog.count({
        where: {
          action: "AGENT_LEARNING_PUBLISHED",
          tenantId
        }
      }),
      prisma.agentBudgetEvent.findMany({
        orderBy: {
          createdAt: "asc"
        },
        where: {
          agentId,
          tenantId
        }
      }),
      prisma.agentExecution.findUniqueOrThrow({
        where: {
          id: executionId
        }
      })
    ]);

  console.log(
    JSON.stringify({
      approvedOutputStatus: approvedOutput?.status ?? null,
      budgetEventKinds: budgetEvents.map((event) => event.kind),
      executionStatus: persistedExecution.status,
      learningPublishedCount,
      memoryEntryCount,
      metrics: {
        execution_count: metrics.execution_count,
        tool_cost: metrics.tool_cost
      },
      outputCount: outputs.length
    })
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
