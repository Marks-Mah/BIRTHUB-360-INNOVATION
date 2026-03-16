import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SupportedPlan = "STARTER" | "PRO" | "ENTERPRISE";

type InternalStateSnapshot = {
  activityStatus: Record<string, string>;
  organizationPlans: Record<string, SupportedPlan>;
};

function createEmptySnapshot(): InternalStateSnapshot {
  return {
    activityStatus: {},
    organizationPlans: {}
  };
}

function resolveStateFilePath(): string {
  const configured = process.env.API_GATEWAY_STATE_FILE?.trim();

  if (configured) {
    return configured;
  }

  return path.join(os.tmpdir(), "birthub-api-gateway-state.json");
}

export class InternalStateStore {
  private cache: InternalStateSnapshot | null = null;
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath = resolveStateFilePath()) {
    this.filePath = filePath;
  }

  private async loadSnapshot(): Promise<InternalStateSnapshot> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const serialized = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(serialized) as Partial<InternalStateSnapshot>;
      this.cache = {
        activityStatus: parsed.activityStatus ?? {},
        organizationPlans: parsed.organizationPlans ?? {}
      };
    } catch {
      this.cache = createEmptySnapshot();
    }

    return this.cache;
  }

  private async persistSnapshot(snapshot: InternalStateSnapshot): Promise<void> {
    this.cache = snapshot;
    this.writeQueue = this.writeQueue.then(async () => {
      const directory = path.dirname(this.filePath);
      const temporaryFilePath = `${this.filePath}.${process.pid}.tmp`;

      await mkdir(directory, { recursive: true });
      await writeFile(temporaryFilePath, JSON.stringify(snapshot, null, 2), "utf8");
      await rename(temporaryFilePath, this.filePath);
    });

    await this.writeQueue;
  }

  async getOrganizationPlan(organizationId: string): Promise<SupportedPlan | null> {
    const snapshot = await this.loadSnapshot();
    return snapshot.organizationPlans[organizationId] ?? null;
  }

  async setOrganizationPlan(organizationId: string, plan: SupportedPlan): Promise<SupportedPlan> {
    const snapshot = await this.loadSnapshot();
    await this.persistSnapshot({
      ...snapshot,
      organizationPlans: {
        ...snapshot.organizationPlans,
        [organizationId]: plan
      }
    });

    return plan;
  }

  async getActivityStatus(activityId: string): Promise<string | null> {
    const snapshot = await this.loadSnapshot();
    return snapshot.activityStatus[activityId] ?? null;
  }

  async setActivityStatus(activityId: string, status: string): Promise<string> {
    const snapshot = await this.loadSnapshot();
    await this.persistSnapshot({
      ...snapshot,
      activityStatus: {
        ...snapshot.activityStatus,
        [activityId]: status
      }
    });

    return status;
  }

  async reset(): Promise<void> {
    await this.persistSnapshot(createEmptySnapshot());
  }
}

export const internalStateStore = new InternalStateStore();
