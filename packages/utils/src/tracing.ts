import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from './logger';

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

export const startTracing = () => {
  sdk.start();
  logger.info('OpenTelemetry initialized');

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info('OpenTelemetry terminated'))
      .catch((error: unknown) => logger.error('Error terminating OpenTelemetry', error as Error))
      .finally(() => process.exit(0));
  });
};
