import { getWorkerConfig } from "@birthub/config";
import { ensureUserPreference, prisma } from "@birthub/database";
import { createLogger } from "@birthub/logger";
import type { Queue } from "bullmq";

const logger = createLogger("worker-email-queue");

export const emailQueueName = "engagement.email";

export interface EmailNotificationJobPayload {
  context: Record<string, unknown>;
  organizationId: string;
  tenantId: string;
  type: "critical_error" | "workflow_completed";
  userId: string;
}

function renderLayout(input: {
  body: string;
  eyebrow: string;
  heading: string;
}) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f5efe4;color:#102a43;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d9e2ec;">
            <tr>
              <td style="background:#0f766e;color:#fff;padding:20px 28px;">
                <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.82;">${input.eyebrow}</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${input.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${input.body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderWorkflowCompletedHtml(context: Record<string, unknown>) {
  const executionId = String(context.executionId ?? "n/a");
  const agentId = String(context.agentId ?? "workflow");
  const link = typeof context.link === "string" ? context.link : "";

  return renderLayout({
    body: `
      <p style="margin-top:0;">O fluxo vinculado ao agente <strong>${agentId}</strong> terminou com sucesso.</p>
      <p><strong>Execucao:</strong> ${executionId}</p>
      ${
        link
          ? `<p><a href="${link}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;">Abrir execucao</a></p>`
          : ""
      }
      <p style="color:#486581;font-size:14px;">Voce esta recebendo este aviso porque habilitou e-mails transacionais na BirthHub.</p>
    `,
    eyebrow: "Workflow",
    heading: "Workflow terminou"
  });
}

function renderCriticalErrorHtml(context: Record<string, unknown>) {
  const executionId = String(context.executionId ?? "n/a");
  const agentId = String(context.agentId ?? "agent");
  const errorMessage = String(context.errorMessage ?? "Erro nao informado.");
  const link = typeof context.link === "string" ? context.link : "";

  return renderLayout({
    body: `
      <p style="margin-top:0;">Detectamos uma falha critica durante a execucao do agente <strong>${agentId}</strong>.</p>
      <p><strong>Execucao:</strong> ${executionId}</p>
      <p><strong>Erro:</strong> ${errorMessage}</p>
      ${
        link
          ? `<p><a href="${link}" style="display:inline-block;background:#b42318;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;">Ver log</a></p>`
          : ""
      }
      <p style="color:#486581;font-size:14px;">O envio externo respeita sua preferencia de notificacoes.</p>
    `,
    eyebrow: "Critical Error",
    heading: "Erro critico detectado"
  });
}

async function sendViaSendgrid(input: {
  from: string;
  html: string;
  subject: string;
  to: string;
}) {
  const config = getWorkerConfig();

  if (!config.SENDGRID_API_KEY) {
    return {
      mock: true,
      status: 200
    };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    body: JSON.stringify({
      content: [
        {
          type: "text/html",
          value: input.html
        }
      ],
      from: {
        email: input.from
      },
      personalizations: [
        {
          to: [{ email: input.to }]
        }
      ],
      subject: input.subject
    }),
    headers: {
      authorization: `Bearer ${config.SENDGRID_API_KEY}`,
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`SendGrid delivery failed with status ${response.status}`);
  }

  return {
    mock: false,
    status: response.status
  };
}

export async function enqueueEmailNotification(
  queue: Queue<EmailNotificationJobPayload>,
  payload: EmailNotificationJobPayload
) {
  await queue.add(payload.type, payload, {
    removeOnComplete: {
      count: 200
    },
    removeOnFail: {
      count: 200
    }
  });
}

export async function processEmailNotificationJob(payload: EmailNotificationJobPayload) {
  const config = getWorkerConfig();
  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    }
  });

  if (!user) {
    return {
      skipped: true
    };
  }

  const preference = await ensureUserPreference({
    organizationId: payload.organizationId,
    tenantId: payload.tenantId,
    userId: payload.userId
  });

  if (!preference.emailNotifications) {
    logger.info(
      {
        tenantId: payload.tenantId,
        type: payload.type,
        userId: payload.userId
      },
      "Email delivery skipped because the user opted out"
    );

    return {
      skipped: true
    };
  }

  const html =
    payload.type === "critical_error"
      ? renderCriticalErrorHtml(payload.context)
      : renderWorkflowCompletedHtml(payload.context);
  const subject =
    payload.type === "critical_error"
      ? "BirthHub360: erro critico detectado"
      : "BirthHub360: workflow terminou";
  const result = await sendViaSendgrid({
    from: config.EMAIL_FROM_ADDRESS,
    html,
    subject,
    to: user.email
  });

  logger.info(
    {
      mock: result.mock,
      status: result.status,
      tenantId: payload.tenantId,
      type: payload.type,
      userId: payload.userId
    },
    "Email notification processed"
  );

  return {
    skipped: false,
    status: result.status
  };
}
