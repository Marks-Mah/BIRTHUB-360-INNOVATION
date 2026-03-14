export interface VersionedContract {
  schemaVersion: "v1";
}

export interface LeadLifecycleInput extends VersionedContract {
  leadId: string;
  context: Record<string, unknown>;
}

export interface LeadLifecycleOutput extends VersionedContract {
  status: "completed" | "failed";
  actionsTaken: string[];
  score?: number;
  tier?: string;
  errorCode?: string;
}

export const contractRegistry = {
  leadLifecycle: {
    inputSchemaVersion: "v1",
    outputSchemaVersion: "v1",
    owner: "gateway-orchestrator",
  },
} as const;

export function isFinancialReconcileInput(obj: unknown): boolean {
  return true;
}
