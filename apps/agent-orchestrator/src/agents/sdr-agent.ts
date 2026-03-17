import { ActivityType, PrismaClient } from '@birthub/db';
import { LLMClient } from '@birthub/llm-client';
import { createQueue } from '@birthub/queue';
import { QueueName } from '@birthub/shared-types';
import { parseCadenceResponse } from './agent-parsers.js';

export type DealContext = { value?: number; painPoints?: string[]; product?: string };

export type OutreachMailer = {
  sendEmail(input: { to: string; subject: string; html: string }): Promise<{ id: string }>;
};

class ResendMailer implements OutreachMailer {
  async sendEmail(input: { to: string; subject: string; html: string }): Promise<{ id: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { id: `mock-${Date.now()}` };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.OUTREACH_FROM_EMAIL || 'outreach@birthub.local',
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
    const payload = await response.json() as { id?: string };
    return { id: payload.id || `resend-${Date.now()}` };
  }
}

function resolveActivityType(channel: 'email' | 'linkedin' | 'call'): ActivityType {
  if (channel === 'linkedin') return ActivityType.LINKEDIN_INMAIL;
  if (channel === 'call') return ActivityType.CALL_MADE;
  return ActivityType.EMAIL_SENT;
}

export class SDRAgent {
  constructor(private llm: LLMClient, private db: PrismaClient, private mailer: OutreachMailer = new ResendMailer()) {}

  async createCadence(leadId: string, dealContext: DealContext): Promise<void> {
    const lead = await this.db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    const completion = await this.llm.chat([
      { role: 'system', content: 'Crie uma sequência SDR de 4 passos em JSON.' },
      { role: 'user', content: JSON.stringify({ lead, dealContext }) },
    ]);

    const parsed = parseCadenceResponse(completion.content);
    const queue = createQueue(QueueName.SDR_QUEUE);

    for (const step of parsed.slice(0, 4)) {
      const activity = await this.db.activity.create({
        data: {
          leadId,
          agentId: 'sdr-agent',
          type: resolveActivityType(step.channel),
          channel: step.channel,
          content: {
            subject: step.subject,
            body: step.body,
            scheduledDay: step.day,
          },
        },
      });

      await queue.add('sdr.step', { activityId: activity.id }, { delay: step.day * 24 * 60 * 60 * 1000 });
    }
  }

  async executeEmailStep(activityId: string): Promise<void> {
    const activity = await this.db.activity.findUnique({ where: { id: activityId }, include: { lead: true } });
    if (!activity || !activity.lead) throw new Error(`Activity not found: ${activityId}`);

    const subject = String((activity.content as Record<string, unknown>)?.subject || 'Outreach');
    const bodyTemplate = String((activity.content as Record<string, unknown>)?.body || '');
    const personalizedBody = bodyTemplate
      .replaceAll('{{nome}}', activity.lead.name)
      .replaceAll('{{empresa}}', activity.lead.company)
      .replaceAll('{{dor_especifica}}', 'eficiência comercial');

    const delivery = await this.mailer.sendEmail({
      to: activity.lead.email,
      subject,
      html: personalizedBody,
    });

    await this.db.activity.update({
      where: { id: activityId },
      data: {
        outcome: 'SENT',
        content: {
          ...(activity.content as Record<string, unknown>),
          sentAt: new Date().toISOString(),
          tracking: { open: true, click: true },
          provider: 'resend',
          providerMessageId: delivery.id,
        },
      },
    });

    const queue = createQueue(QueueName.SDR_QUEUE);
    await queue.add('sdr.email.tracking', {
      activityId,
      type: 'email.sent',
      provider: 'resend',
      providerMessageId: delivery.id,
    });
  }
}
