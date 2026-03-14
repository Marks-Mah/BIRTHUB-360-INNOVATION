export interface EmailAdapter {
  send(tenantId: string, input: { to: string; subject: string; html: string }): Promise<{ provider: string }>;
}

class ProviderEmailAdapter implements EmailAdapter {
  constructor(private readonly provider: string, private readonly shouldFail: (tenantId: string) => boolean) {}

  async send(tenantId: string): Promise<{ provider: string }> {
    if (this.shouldFail(tenantId)) throw new Error(`${this.provider}_FAILED`);
    return { provider: this.provider };
  }
}

export class EmailAdapterFactory {
  private readonly providers: EmailAdapter[];

  constructor(providers?: EmailAdapter[]) {
    this.providers = providers ?? [
      new ProviderEmailAdapter("resend", () => false),
      new ProviderEmailAdapter("mailgun", () => false),
    ];
  }

  async sendWithFallback(tenantId: string, input: { to: string; subject: string; html: string }) {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.send(tenantId, input);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("EMAIL_SEND_FAILED");
  }
}
