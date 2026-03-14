export interface DelayNodeConfig {
  duration_ms: number;
}

export function executeDelayNode(config: DelayNodeConfig): {
  delayMs: number;
  releaseAt: Date;
} {
  const delayMs = Math.max(1, Math.floor(config.duration_ms));
  return {
    delayMs,
    releaseAt: new Date(Date.now() + delayMs)
  };
}

