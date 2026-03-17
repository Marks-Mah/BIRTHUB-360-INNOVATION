import { prisma } from "@birthub/db";

export interface AgentLog {
  id: string;
  agentName: string;
  action: string;
  input?: any;
  output?: any;
  durationMs?: number | null;
  error?: string | null;
  createdAt: string;
}

export class AgentLogRepository {
  async findMany(limit = 50, offset = 0): Promise<AgentLog[]> {
    const logs = await prisma.agentLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    return logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
      input: log.input ?? undefined,
      output: log.output ?? undefined,
    }));
  }
}
