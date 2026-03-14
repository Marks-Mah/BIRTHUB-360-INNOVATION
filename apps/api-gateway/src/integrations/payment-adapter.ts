import { executeWithResilience, ResiliencePolicy } from "./resilience.js";
import { IntegrationError } from "./error-catalog.js";

export interface PaymentChargeInput {
  customerId: string;
  amountCents: number;
  currency: string;
}

export interface PaymentChargeResult {
  provider: string;
  chargeId: string;
  status: "succeeded" | "failed";
}

export interface PaymentProviderAdapter {
  readonly providerName: string;
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
}

type HttpMethod = "POST";

interface HttpJsonClient {
  request<T>(args: {
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    timeoutMs: number;
  }): Promise<T>;
}

class FetchHttpJsonClient implements HttpJsonClient {
  async request<T>(args: {
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    timeoutMs: number;
  }): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), args.timeoutMs);

    try {
      const response = await fetch(args.url, {
        method: args.method,
        headers: {
          "content-type": "application/json",
          ...args.headers,
        },
        body: JSON.stringify(args.body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new IntegrationError("INTEGRATION_PROVIDER_ERROR", `Payment provider returned ${response.status}`, {
          status: response.status,
          url: args.url,
        });
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof IntegrationError) throw error;

      throw new IntegrationError("INTEGRATION_PROVIDER_ERROR", "Payment provider request failed", {
        message: error instanceof Error ? error.message : String(error),
        url: args.url,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class PaymentService {
  constructor(
    private readonly adapter: PaymentProviderAdapter,
    private readonly policy: ResiliencePolicy,
  ) {}

  async reconcilePayment(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    return executeWithResilience(this.adapter.providerName, () => this.adapter.charge(input), this.policy);
  }
}

export class MockPaymentAdapter implements PaymentProviderAdapter {
  readonly providerName = "mock-payment";

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    return {
      provider: this.providerName,
      chargeId: `chg_${input.customerId}_${input.amountCents}`,
      status: "succeeded",
    };
  }
}

class AsaasPaymentAdapter implements PaymentProviderAdapter {
  readonly providerName = "asaas";

  constructor(
    private readonly client: HttpJsonClient,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    const payload = await this.client.request<{ id: string; status?: string }>({
      url: `${this.baseUrl}/v3/payments`,
      method: "POST",
      headers: { access_token: this.apiKey },
      body: {
        customer: input.customerId,
        value: Number((input.amountCents / 100).toFixed(2)),
        billingType: "UNDEFINED",
      },
      timeoutMs: 15_000,
    });

    return {
      provider: this.providerName,
      chargeId: payload.id,
      status: payload.status === "RECEIVED" ? "succeeded" : "failed",
    };
  }
}

class PagarmePaymentAdapter implements PaymentProviderAdapter {
  readonly providerName = "pagarme";

  constructor(
    private readonly client: HttpJsonClient,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    const payload = await this.client.request<{ id: string; status?: string }>({
      url: `${this.baseUrl}/charges`,
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}` },
      body: {
        amount: input.amountCents,
        currency: input.currency,
        customer_id: input.customerId,
      },
      timeoutMs: 15_000,
    });

    return {
      provider: this.providerName,
      chargeId: payload.id,
      status: payload.status === "paid" ? "succeeded" : "failed",
    };
  }
}

export function createPaymentAdapterFromEnv(): PaymentProviderAdapter {
  const provider = process.env.PAYMENT_PROVIDER?.toLowerCase() ?? (process.env.NODE_ENV === "test" ? "mock" : "asaas");
  const client = new FetchHttpJsonClient();

  if (provider === "mock") return new MockPaymentAdapter();

  if (provider === "asaas") {
    const apiKey = process.env.ASAAS_API_KEY;
    const baseUrl = process.env.ASAAS_BASE_URL;
    if (!apiKey || !baseUrl) throw new IntegrationError("INTEGRATION_PROVIDER_ERROR", "ASAAS_API_KEY and ASAAS_BASE_URL are required for asaas provider");
    return new AsaasPaymentAdapter(client, apiKey, baseUrl);
  }

  if (provider === "pagarme") {
    const apiKey = process.env.PAGARME_API_KEY;
    const baseUrl = process.env.PAGARME_BASE_URL;
    if (!apiKey || !baseUrl) throw new IntegrationError("INTEGRATION_PROVIDER_ERROR", "PAGARME_API_KEY and PAGARME_BASE_URL are required for pagarme provider");
    return new PagarmePaymentAdapter(client, apiKey, baseUrl);
  }

  throw new IntegrationError("INTEGRATION_PROVIDER_ERROR", `Unsupported payment provider: ${provider}`);
}
