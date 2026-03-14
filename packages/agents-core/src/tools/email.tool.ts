import { setTimeout as sleep } from "node:timers/promises";

export type EmailProvider = "smtp" | "sendgrid";

export interface EmailSendInput {
  body: string;
  provider: EmailProvider;
  subject: string;
  tenantId: string;
  to: string;
}

export interface EmailSendResult {
  bounced: boolean;
  messageId: string;
  provider: EmailProvider;
  retries: number;
}

export interface EmailAdapter {
  send(input: EmailSendInput): Promise<{ bounced: boolean; messageId: string }>;
}

class MockSmtpAdapter implements EmailAdapter {
  async send(input: EmailSendInput): Promise<{ bounced: boolean; messageId: string }> {
    const bounced = input.to.endsWith("@bounce.test");

    return {
      bounced,
      messageId: `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };
  }
}

class MockSendgridAdapter implements EmailAdapter {
  async send(input: EmailSendInput): Promise<{ bounced: boolean; messageId: string }> {
    const bounced = input.to.endsWith("@bounce.test");

    return {
      bounced,
      messageId: `sendgrid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };
  }
}

const defaultAdapters: Record<EmailProvider, EmailAdapter> = {
  sendgrid: new MockSendgridAdapter(),
  smtp: new MockSmtpAdapter()
};

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /rate|429|limit/i.test(error.message);
}

export async function sendEmail(
  input: EmailSendInput,
  options?: {
    adapters?: Partial<Record<EmailProvider, EmailAdapter>>;
    maxRetries?: number;
  }
): Promise<EmailSendResult> {
  const adapters = { ...defaultAdapters, ...(options?.adapters ?? {}) };
  const maxRetries = Math.max(options?.maxRetries ?? 2, 0);

  const adapter = adapters[input.provider];

  if (!adapter) {
    throw new Error(`No email adapter configured for provider '${input.provider}'.`);
  }

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await adapter.send(input);

      return {
        bounced: result.bounced,
        messageId: result.messageId,
        provider: input.provider,
        retries: attempt
      };
    } catch (error) {
      if (attempt >= maxRetries || !isRateLimitError(error)) {
        throw error;
      }

      attempt += 1;
      await sleep(50 * attempt);
    }
  }

  throw new Error("Unexpected email retry state.");
}
