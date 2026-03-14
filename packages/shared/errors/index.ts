export type ErrorCategory =
  | "VALIDATION"
  | "AUTH"
  | "PERMISSION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTEGRATION"
  | "INTERNAL";

export interface DomainErrorData {
  code: string;
  message: string;
  category: ErrorCategory;
  details?: Record<string, unknown>;
}

export class DomainError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly details?: Record<string, unknown>;

  constructor({ code, message, category, details }: DomainErrorData) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.category = category;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      details: this.details,
    };
  }
}
