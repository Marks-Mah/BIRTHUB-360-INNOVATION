import type { ApiConfig } from "@birthub/config";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

let sdk: NodeSDK | undefined;

// ADR-009: the Cycle 1 API coexists with legacy services, so telemetry is isolated behind an opt-in exporter.
export async function initializeOpenTelemetry(config: ApiConfig): Promise<void> {
  if (sdk || !config.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return;
  }

  sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false
        }
      }),
      new PrismaInstrumentation()
    ],
    resource: resourceFromAttributes({
      "service.name": config.OTEL_SERVICE_NAME
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/traces`
    })
  });

  await sdk.start();
}

export async function shutdownOpenTelemetry(): Promise<void> {
  if (!sdk) {
    return;
  }

  await sdk.shutdown();
  sdk = undefined;
}
