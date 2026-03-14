import { postJson } from "./http";

export interface FiscalInvoice {
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  customerAddress: string;
  serviceCode: string; // Código do serviço
  amount: number;
  description: string;
}

export interface FiscalResponse {
  id: string;
  status: string; // authorized, denied, canceled, processing
  nfeUrl?: string;
  nfeKey?: string;
  xmlUrl?: string;
  errors?: string[];
}

export interface IFiscalClient {
  emitNFe(invoice: FiscalInvoice, tenantId: string): Promise<FiscalResponse>;
  cancelNFe(id: string, reason: string): Promise<FiscalResponse>;
  getStatus(id: string): Promise<FiscalResponse>;
}

export class ENotasClient implements IFiscalClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.enotasgw.com.br/v2",
  ) {}

  async emitNFe(
    invoice: FiscalInvoice,
    tenantId: string,
  ): Promise<FiscalResponse> {
    const payload = {
      tipo: "NFS-e",
      idExterno: invoice.referenceId,
      status: "emitir",
      cliente: {
        nome: invoice.customerName,
        email: invoice.customerEmail,
        cpfCnpj: invoice.customerDocument,
        endereco: {
          uf: "SP", // Simplification
          cidade: "São Paulo",
          logradouro: invoice.customerAddress,
          numero: "123",
          cep: "01001000",
        },
      },
      servico: {
        descricao: invoice.description,
        cnae: invoice.serviceCode, // CNAE or service item code
        valorTotal: invoice.amount,
      },
      tags: [tenantId],
    };

    const response = await postJson<any>(`${this.baseUrl}/empresas/{empresaId}/nfs-e`, payload, {
      apiKey: this.apiKey, // eNotas uses Basic Auth or Header API Key
      headers: {
        Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
    });

    return {
      id: response.id,
      status: response.status,
      nfeUrl: response.linkPdf,
      xmlUrl: response.linkXml,
    };
  }

  async cancelNFe(id: string, reason: string): Promise<FiscalResponse> {
    // Implement cancellation logic
    // DELETE /nfs-e/{nfeId}
    const response = await postJson<any>(
      `${this.baseUrl}/nfs-e/${id}`,
      { motivo: reason }, // Usually delete or specific endpoint
      {
        headers: {
          Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
        },
      },
    );
    return {
      id,
      status: "canceled",
    };
  }

  async getStatus(id: string): Promise<FiscalResponse> {
    // Implement status check logic (GET)
    // For now, mock or throw
    throw new Error("Method not implemented.");
  }
}
