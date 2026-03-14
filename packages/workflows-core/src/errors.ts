export class InvalidGraphError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "InvalidGraphError";
  }
}

export class CyclicDependencyError extends InvalidGraphError {
  constructor(readonly cyclePath: string[]) {
    super(`Workflow graph contains a cycle: ${cyclePath.join(" -> ")}`, { cyclePath });
    this.name = "CyclicDependencyError";
  }
}

export class InvalidStepConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStepConfigError";
  }
}

