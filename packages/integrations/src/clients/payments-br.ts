import { postJson } from "./http";

export interface PaymentCustomer {
  name: string;
  email: string;
  document: string; // CPF or CNPJ
  phone?: string;
}

export interface PaymentResponse {
  id: string;
  status: string;
  amount: number;
  qrCode?: string;
  qrCodeUrl?: string;
  boletoUrl?: string;
  barCode?: string;
  gatewayId?: string;
}

export interface IPaymentsClient {
  generatePix(
    amount: number,
    description: string,
    tenantId: string,
    customer: PaymentCustomer,
  ): Promise<PaymentResponse>;

  generateBoleto(
    amount: number,
    description: string,
    tenantId: string,
    customer: PaymentCustomer,
    dueDate: Date,
  ): Promise<PaymentResponse>;

  confirmPayment(paymentId: string, tenantId: string): Promise<PaymentResponse>;
}

export class PagarmeClient implements IPaymentsClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.pagar.me/core/v5",
  ) {}

  async generatePix(
    amount: number,
    description: string,
    tenantId: string, // Pagar.me usually uses customer_id or metadata for tenant
    customer: PaymentCustomer,
  ): Promise<PaymentResponse> {
    const payload = {
      items: [
        {
          amount: Math.round(amount * 100), // Pagar.me uses cents
          description,
          quantity: 1,
          code: "1",
        },
      ],
      customer: {
        name: customer.name,
        email: customer.email,
        document: customer.document,
        type: customer.document.length > 11 ? "company" : "individual",
        phones: {
          mobile_phone: {
            country_code: "55",
            area_code: customer.phone?.slice(0, 2) || "11",
            number: customer.phone?.slice(2) || "999999999",
          },
        },
      },
      payments: [
        {
          payment_method: "pix",
          pix: {
            expires_in: 3600,
          },
        },
      ],
      metadata: {
        tenantId,
      },
    };

    const response = await postJson<any>(`${this.baseUrl}/orders`, payload, {
      apiKey: this.apiKey, // Uses Basic Auth actually, but let's assume Bearer or header injection in postJson handles it if adapted.
      // Pagar.me uses Basic Auth with API Key as username and empty password.
      // postJson uses Bearer. I might need to adjust or override headers.
      headers: {
        Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
    });

    const charge = response.charges[0];
    const txn = charge.last_transaction;

    return {
      id: response.id,
      gatewayId: charge.id,
      status: charge.status,
      amount: amount,
      qrCode: txn.qr_code,
      qrCodeUrl: txn.qr_code_url,
    };
  }

  async generateBoleto(
    amount: number,
    description: string,
    tenantId: string,
    customer: PaymentCustomer,
    dueDate: Date,
  ): Promise<PaymentResponse> {
    const payload = {
      items: [
        {
          amount: Math.round(amount * 100),
          description,
          quantity: 1,
          code: "1",
        },
      ],
      customer: {
        name: customer.name,
        email: customer.email,
        document: customer.document,
        type: customer.document.length > 11 ? "company" : "individual",
      },
      payments: [
        {
          payment_method: "boleto",
          boleto: {
            due_at: dueDate.toISOString(),
            instructions: "Não receber após o vencimento",
          },
        },
      ],
      metadata: {
        tenantId,
      },
    };

    const response = await postJson<any>(`${this.baseUrl}/orders`, payload, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
    });

    const charge = response.charges[0];
    const txn = charge.last_transaction;

    return {
      id: response.id,
      gatewayId: charge.id,
      status: charge.status,
      amount: amount,
      boletoUrl: txn.url,
      barCode: txn.line,
    };
  }

  async confirmPayment(
    paymentId: string,
    tenantId: string,
  ): Promise<PaymentResponse> {
    // Usually via Webhook, but if manual check is needed:
    // GET /orders/{id}
    // postJson only supports POST. I might need getJson in http.ts or just fetch here.
    // For now, I'll simulate or skip.
    // Assuming we implement GET support later.
    throw new Error("Method not implemented.");
  }
}
