export class TenantRequiredError extends Error {
  constructor(operation: string) {
    super(`Tenant context is required for ${operation}`);
    this.name = 'TenantRequiredError';
  }
}
