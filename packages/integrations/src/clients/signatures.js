import { postJson } from "./http";
export class ClickSignClient {
    accessToken;
    baseUrl;
    constructor(accessToken, baseUrl = "https://app.clicksign.com/api/v1") {
        this.accessToken = accessToken;
        this.baseUrl = baseUrl;
    }
    async createDocument(templateId, signers, path, // Directory path in ClickSign
    tenantId) {
        // 1. Create document from template or upload
        // Simplified flow: assume uploading content or using template
        // This example assumes uploading a file (not implemented here fully) or using a template endpoint (not standard in v1 API, usually you upload a PDF).
        // Let's assume we are creating a document by uploading bytes (mocked here) or referencing a template.
        // Mock implementation for structure
        const payload = {
            document: {
                path: path,
                template_ids: [templateId],
            },
            signers: signers.map((s) => ({
                email: s.email,
                name: s.name,
                auths: [s.authMethod || "email"],
                phone_number: s.phoneNumber,
            })),
            metadata: {
                tenantId,
            },
        };
        // Note: ClickSign API is more complex (upload doc, add signers to list, add list to doc).
        // This is a simplified abstraction.
        const response = await postJson(`${this.baseUrl}/documents?access_token=${this.accessToken}`, payload);
        return this._mapResponse(response.document);
    }
    async sendForSignature(documentId) {
        // ClickSign usually sends automatically when signers are added and document is finished setup.
        // Or we can trigger a notification.
        await postJson(`${this.baseUrl}/documents/${documentId}/notifications?access_token=${this.accessToken}`, { message: "Please sign this document." });
    }
    async getStatus(documentId) {
        // Need GET request
        throw new Error("Method not implemented.");
    }
    _mapResponse(doc) {
        return {
            id: doc.key,
            name: doc.filename,
            status: doc.status,
            signers: [], // Map signers from response
        };
    }
}
