class ProviderEmailAdapter {
    provider;
    shouldFail;
    constructor(provider, shouldFail) {
        this.provider = provider;
        this.shouldFail = shouldFail;
    }
    async send(tenantId) {
        if (this.shouldFail(tenantId))
            throw new Error(`${this.provider}_FAILED`);
        return { provider: this.provider };
    }
}
export class EmailAdapterFactory {
    providers;
    constructor(providers) {
        this.providers = providers ?? [
            new ProviderEmailAdapter("resend", () => false),
            new ProviderEmailAdapter("mailgun", () => false),
        ];
    }
    async sendWithFallback(tenantId, input) {
        let lastError;
        for (const provider of this.providers) {
            try {
                return await provider.send(tenantId, input);
            }
            catch (error) {
                lastError = error;
            }
        }
        throw lastError instanceof Error ? lastError : new Error("EMAIL_SEND_FAILED");
    }
}
