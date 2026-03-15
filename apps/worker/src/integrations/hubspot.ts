import { getWorkerConfig } from "@birthub/config";
import { prisma, SubscriptionStatus } from "@birthub/database";
import { createLogger } from "@birthub/logger";

const logger = createLogger("worker-hubspot");

export class HubspotRateLimitError extends Error {
  constructor(message = "HubSpot API rate limit reached.") {
    super(message);
    this.name = "HubspotRateLimitError";
  }
}

interface HubspotCompanyPayload {
  arrCents: number;
  domain: string | null;
  healthScore: number;
  name: string;
  organizationId: string;
  planCode: string;
  status: string;
  tenantId: string;
}

type HubspotResponse = {
  body: string;
  companyId: string | null;
  status: number;
};

class HubspotSyncAdapter {
  constructor(
    private readonly token: string | undefined,
    private readonly baseUrl: string
  ) {}

  private async request(input: {
    method: "PATCH" | "POST";
    path: string;
    payload: Record<string, unknown>;
  }): Promise<HubspotResponse> {
    if (!this.token) {
      const body = JSON.stringify({
        mock: true,
        payload: input.payload
      });

      return {
        body,
        companyId:
          typeof input.payload.id === "string"
            ? input.payload.id
            : `mock-${Date.now().toString(36)}`,
        status: 200
      };
    }

    const response = await fetch(`${this.baseUrl}${input.path}`, {
      body: JSON.stringify(input.payload),
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json"
      },
      method: input.method
    });

    const body = await response.text();

    if (response.status === 429) {
      throw new HubspotRateLimitError();
    }

    if (!response.ok) {
      throw new Error(`HubSpot sync failed with status ${response.status}: ${body}`);
    }

    let companyId: string | null = null;
    try {
      const parsed = JSON.parse(body) as { id?: unknown };
      companyId = typeof parsed.id === "string" ? parsed.id : null;
    } catch {
      // Keep fallback when HubSpot omits an `id` in the response body.
    }

    return {
      body,
      companyId,
      status: response.status
    };
  }

  async upsertCompany(payload: HubspotCompanyPayload & { hubspotCompanyId?: string | null }) {
    const properties = {
      bh_arr_cents: String(payload.arrCents),
      bh_health_score: String(payload.healthScore),
      bh_plan_code: payload.planCode,
      bh_subscription_status: payload.status,
      bh_tenant_id: payload.tenantId,
      domain: payload.domain ?? undefined,
      name: payload.name
    };

    if (payload.hubspotCompanyId) {
      return this.request({
        method: "PATCH",
        path: `/crm/v3/objects/companies/${payload.hubspotCompanyId}`,
        payload: {
          properties
        }
      });
    }

    return this.request({
      method: "POST",
      path: "/crm/v3/objects/companies",
      payload: {
        properties
      }
    });
  }
}

async function loadOrganizationSnapshot(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    include: {
      memberships: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: "asc"
        },
        take: 1
      },
      subscriptions: {
        include: {
          plan: true
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 1
      }
    },
    where: {
      id: organizationId
    }
  });

  if (!organization) {
    throw new Error("CRM_SYNC_ORGANIZATION_NOT_FOUND");
  }

  const subscription = organization.subscriptions[0] ?? null;
  const owner = organization.memberships[0]?.user ?? null;

  return {
    arrCents: (subscription?.plan.monthlyPriceCents ?? 0) * 12,
    domain:
      organization.primaryDomain ??
      (owner?.email.includes("@") ? owner.email.split("@")[1] ?? null : null) ??
      null,
    healthScore: organization.healthScore,
    hubspotCompanyId: organization.hubspotCompanyId,
    name: organization.name,
    organizationId: organization.id,
    planCode: subscription?.plan.code ?? "starter",
    status: subscription?.status ?? SubscriptionStatus.trial,
    tenantId: organization.tenantId
  };
}

export async function syncOrganizationToHubspot(input: {
  organizationId: string;
  tenantId: string;
}) {
  const config = getWorkerConfig();
  const snapshot = await loadOrganizationSnapshot(input.organizationId);
  const adapter = new HubspotSyncAdapter(
    config.HUBSPOT_ACCESS_TOKEN || undefined,
    config.HUBSPOT_BASE_URL
  );

  const response = await adapter.upsertCompany(snapshot);

  await prisma.crmSyncEvent.create({
    data: {
      eventType: "company.upsert",
      organizationId: snapshot.organizationId,
      requestBody: {
        arrCents: snapshot.arrCents,
        domain: snapshot.domain,
        healthScore: snapshot.healthScore,
        name: snapshot.name,
        planCode: snapshot.planCode,
        status: snapshot.status,
        tenantId: snapshot.tenantId
      },
      responseBody: response.body,
      responseStatus: response.status,
      tenantId: snapshot.tenantId
    }
  });

  if (response.companyId && response.companyId !== snapshot.hubspotCompanyId) {
    await prisma.organization.update({
      data: {
        hubspotCompanyId: response.companyId
      },
      where: {
        id: snapshot.organizationId
      }
    });
  }

  logger.info(
    {
      mock: !config.HUBSPOT_ACCESS_TOKEN,
      organizationId: snapshot.organizationId,
      responseStatus: response.status,
      tenantId: snapshot.tenantId
    },
    "HubSpot organization sync completed"
  );

  return response;
}
