export class TenantRequiredError extends Error {
  constructor(operation = "this operation") {
    super(`Tenant context is required for ${operation}.`);
    this.name = "TenantRequiredError";
  }
}
