export class ExceededQuotaError extends Error {
  public readonly current: number;
  public readonly limit: number;
  public readonly resetAt: string;
  public readonly resourceType: string;
  public readonly tenantId: string;
  public readonly upgradeUrl: string;

  constructor(input: {
    current: number;
    limit: number;
    resetAt: string;
    resourceType: string;
    tenantId: string;
    upgradeUrl?: string;
  }) {
    super(`Quota exceeded for ${input.resourceType}.`);
    this.name = "ExceededQuotaError";
    this.current = input.current;
    this.limit = input.limit;
    this.resetAt = input.resetAt;
    this.resourceType = input.resourceType;
    this.tenantId = input.tenantId;
    this.upgradeUrl = input.upgradeUrl ?? "/billing";
  }
}
