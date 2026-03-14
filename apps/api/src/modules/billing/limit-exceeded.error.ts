export class LimitExceededError extends Error {
  readonly current: number;
  readonly limit: number;
  readonly resource: string;

  constructor(input: { current: number; limit: number; resource: string }) {
    super(`${input.resource} limit exceeded (${input.current}/${input.limit}).`);
    this.name = "LimitExceededError";
    this.current = input.current;
    this.limit = input.limit;
    this.resource = input.resource;
  }
}
