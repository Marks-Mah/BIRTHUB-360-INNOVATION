export type IntegrationErrorCode =
  | "INTEGRATION_TIMEOUT"
  | "INTEGRATION_RETRY_EXHAUSTED"
  | "INTEGRATION_CIRCUIT_OPEN"
  | "INTEGRATION_PROVIDER_ERROR";

export class IntegrationError extends Error {
  constructor(
    public readonly code: IntegrationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}
