import { z } from "zod";

import { BaseTool, type BaseToolOptions, type ToolExecutionContext } from "./baseTool.js";

const sendEmailInputSchema = z
  .object({
    dynamicTemplateData: z.record(z.string(), z.unknown()).default({}),
    html: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    templateId: z.string().min(1).optional(),
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    tracking: z
      .object({
        clickTracking: z.boolean().default(true),
        openTracking: z.boolean().default(true)
      })
      .strict()
      .default({ clickTracking: true, openTracking: true })
  })
  .superRefine((value, context) => {
    if (!value.templateId && !(value.subject && value.html)) {
      context.addIssue({
        code: "custom",
        message: "Provide templateId OR both subject + html."
      });
    }
  });

const sendEmailOutputSchema = z
  .object({
    accepted: z.boolean(),
    messageId: z.string().optional(),
    statusCode: z.number().int()
  })
  .strict();

export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;
export type SendEmailOutput = z.infer<typeof sendEmailOutputSchema>;

export interface SendEmailToolOptions extends BaseToolOptions {
  apiKey?: string;
  fromEmail?: string;
  fetchImpl?: typeof fetch;
}

export class SendEmailTool extends BaseTool<SendEmailInput, SendEmailOutput> {
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly fromEmail: string | undefined;

  constructor(options: SendEmailToolOptions = {}) {
    super(
      {
        description: "SendGrid-based transactional email tool with tracking and bounce metadata.",
        inputSchema: sendEmailInputSchema,
        name: "send-email",
        outputSchema: sendEmailOutputSchema
      },
      options
    );

    this.apiKey = options.apiKey ?? process.env.SENDGRID_API_KEY;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.fromEmail = options.fromEmail ?? process.env.SENDGRID_FROM_EMAIL;
  }

  protected async execute(input: SendEmailInput, context: ToolExecutionContext): Promise<SendEmailOutput> {
    if (!this.apiKey) {
      throw new Error("SENDGRID_API_KEY is not configured.");
    }

    if (!this.fromEmail) {
      throw new Error("SENDGRID_FROM_EMAIL is not configured.");
    }

    const recipients = Array.isArray(input.to) ? input.to : [input.to];
    const personalizations = [
      {
        custom_args: {
          agent_id: context.agentId,
          bounce_handler: "enabled",
          tenant_id: context.tenantId
        },
        dynamic_template_data: input.dynamicTemplateData,
        to: recipients.map((email) => ({ email }))
      }
    ];

    const payload = {
      content: input.html
        ? [
            {
              type: "text/html",
              value: input.html
            }
          ]
        : undefined,
      from: {
        email: this.fromEmail
      },
      personalizations,
      subject: input.subject,
      template_id: input.templateId,
      tracking_settings: {
        click_tracking: {
          enable: input.tracking.clickTracking
        },
        open_tracking: {
          enable: input.tracking.openTracking
        }
      }
    };

    const response = await this.fetchImpl("https://api.sendgrid.com/v3/mail/send", {
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      signal: AbortSignal.timeout(this.timeoutMs)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid request failed (${response.status}): ${errorBody}`);
    }

    return {
      accepted: response.status >= 200 && response.status < 300,
      messageId: response.headers.get("x-message-id") ?? undefined,
      statusCode: response.status
    };
  }
}
