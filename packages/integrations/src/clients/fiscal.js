import { postJson } from "./http";
export class ENotasClient {
    apiKey;
    baseUrl;
    constructor(apiKey, baseUrl = "https://api.enotasgw.com.br/v2") {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async emitNFe(invoice, tenantId) {
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
        const response = await postJson(`${this.baseUrl}/empresas/{empresaId}/nfs-e`, payload, {
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
    async cancelNFe(id, reason) {
        // Implement cancellation logic
        // DELETE /nfs-e/{nfeId}
        const response = await postJson(`${this.baseUrl}/nfs-e/${id}`, { motivo: reason }, // Usually delete or specific endpoint
        {
            headers: {
                Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
            },
        });
        return {
            id,
            status: "canceled",
        };
    }
    async getStatus(id) {
        // Implement status check logic (GET)
        // For now, mock or throw
        throw new Error("Method not implemented.");
    }
}
