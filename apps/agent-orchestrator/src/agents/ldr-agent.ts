import { LeadStatus, PrismaClient } from '@birthub/db';
import { LLMClient } from '@birthub/llm-client';
import { createQueue } from '@birthub/queue';
import { parseQualificationResponse, type LeadQualificationResult } from './agent-parsers.js';

type CompanyEnrichment = { techStack?: unknown; headcount?: number | null; funding?: string | null };
type ContactEnrichment = { orgChart?: unknown; emailValid?: boolean; emailStatus?: string };

export type EnrichmentProviders = {
  lookupCompany(lead: { company: string; domain?: string | null }): Promise<CompanyEnrichment>;
  lookupContacts(lead: { name: string; company: string; email: string }): Promise<ContactEnrichment>;
};

const defaultProviders: EnrichmentProviders = {
  async lookupCompany(_lead) {
    return { techStack: ['unknown'], headcount: null, funding: null };
  },
  async lookupContacts(lead) {
    return {
      orgChart: [{ role: 'Decision Maker', source: 'proxycurl' }],
      emailValid: Boolean(lead.email),
      emailStatus: lead.email ? 'valid' : 'invalid',
    };
  },
};

const QUALIFIED_EVENTS_QUEUE = 'LDR_QUALIFY';

export class LDRAgent {
  constructor(private llm: LLMClient, private db: PrismaClient, private providers: EnrichmentProviders = defaultProviders) {}

  async qualifyLead(leadId: string): Promise<LeadQualificationResult> {
    const lead = await this.db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    const response = await this.llm.chat([
      {
        role: 'system',
        content: 'Você é um LDR Agent. Responda APENAS JSON com icpScore(0-100), icpTier(T1/T2/T3), reasoning.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          company: lead.company,
          jobTitle: lead.jobTitle,
          techStack: lead.techStack,
          intentSignals: lead.intentSignals,
        }),
      },
    ]);

    const parsed = parseQualificationResponse(response.content);

    await this.db.lead.update({
      where: { id: leadId },
      data: {
        icpScore: parsed.icpScore,
        icpTier: parsed.icpTier,
        status: parsed.icpScore < 30 ? LeadStatus.DISQUALIFIED : lead.status,
      },
    });

    if (parsed.icpScore >= 60) {
      const queue = createQueue(QUALIFIED_EVENTS_QUEUE);
      await queue.add('lead.qualified', { leadId, icpScore: parsed.icpScore });
    }

    return parsed;
  }

  async enrichLead(leadId: string): Promise<void> {
    const lead = await this.db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    const companyData = await this.providers.lookupCompany({ company: lead.company });
    const contactData = await this.providers.lookupContacts({ name: lead.name, company: lead.company, email: lead.email });

    const enriched = {
      techStack: companyData.techStack ?? ['unknown'],
      orgChart: contactData.orgChart ?? [{ role: 'Decision Maker', source: 'proxycurl' }],
      emailValid: contactData.emailValid ?? Boolean(lead.email),
      emailStatus: contactData.emailStatus ?? (lead.email ? 'valid' : 'invalid'),
      financialData: {
        ...(lead.financialData as Record<string, unknown> | null ?? {}),
        headcount: companyData.headcount ?? null,
        funding: companyData.funding ?? null,
      },
    };

    await this.db.lead.update({
      where: { id: leadId },
      data: enriched,
    });

    await this.qualifyLead(leadId);
  }
}
