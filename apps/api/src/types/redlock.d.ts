declare module "redlock" {
  export default class Redlock {
    constructor(
      clients: readonly unknown[],
      settings?: {
        retryCount?: number;
        retryDelay?: number;
        retryJitter?: number;
      }
    );

    acquire(
      resources: readonly string[],
      duration: number
    ): Promise<{
      release(): Promise<void>;
    }>;
  }
}
