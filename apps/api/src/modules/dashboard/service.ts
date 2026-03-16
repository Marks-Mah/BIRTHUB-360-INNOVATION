import { Prisma, prisma } from "@birthub/database";

import { getBillingSnapshot } from "../billing/service.js";

type PipelineItem = { stage: string; value: number; trend: string };
type HealthScoreItem = { client: string; score: number; risk: string; nps: number };
type FinanceItem = { label: string; value: string; delta: string };
type AttributionItem = { source: string; leads: number; conversion: string; cac: string };
type ContractItem = { customer: string; status: string; mrr: string; owner: string };

type DashboardMetrics = {
  finance: FinanceItem[];
  pipeline: PipelineItem[];
};

type DashboardAgentStatuses = {
  healthScore: HealthScoreItem[];
};

type DashboardRecentTasks = {
  attribution: AttributionItem[];
  contracts: ContractItem[];
};

type DashboardBillingSummary = {
  finance: FinanceItem[];
};

function asObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNumber(value: Record<string, unknown> | null, key: string): number | null {
  if (!value) {
    return null;
  }

  const candidate = value[key];
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readString(value: Record<string, unknown> | null, key: string): string | null {
  if (!value) {
    return null;
  }

  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function riskFromScore(score: number): string {
  if (score >= 80) {
    return "baixo";
  }

  if (score >= 60) {
    return "médio";
  }

  return "alto";
}

function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format((cents ?? 0) / 100);
}

function formatDelta(current: number, previous: number, unit: string): string {
  const delta = current - previous;
  if (delta === 0) {
    return `estável vs período anterior`;
  }

  const signal = delta > 0 ? "+" : "";
  return `${signal}${delta} ${unit} vs período anterior`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

async function loadOrganizationContext(organizationId: string, tenantId: string) {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    organization,
    activityWindow,
    customers,
    customerTotalCount,
    newCustomersCurrent,
    newCustomersPrevious,
    workflowCurrent,
    workflowPrevious,
    agentCurrent,
    agentPrevious,
    paidInvoicesCurrent,
    paidInvoicesPrevious,
    pastDueInvoices,
    defaultOwnerMembership,
    snapshot
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: {
        id: organizationId
      }
    }),
    prisma.tenantActivityWindow.findUnique({
      where: {
        tenantId_windowDays: {
          tenantId,
          windowDays: 30
        }
      }
    }),
    prisma.customer.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      take: 10,
      where: {
        organizationId,
        tenantId
      }
    }),
    prisma.customer.count({
      where: {
        organizationId,
        tenantId
      }
    }),
    prisma.customer.count({
      where: {
        createdAt: {
          gte: monthAgo
        },
        organizationId,
        tenantId
      }
    }),
    prisma.customer.count({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: monthAgo
        },
        organizationId,
        tenantId
      }
    }),
    prisma.workflowExecution.count({
      where: {
        organizationId,
        startedAt: {
          gte: monthAgo
        },
        tenantId
      }
    }),
    prisma.workflowExecution.count({
      where: {
        organizationId,
        startedAt: {
          gte: previousMonthStart,
          lt: monthAgo
        },
        tenantId
      }
    }),
    prisma.agentExecution.count({
      where: {
        organizationId,
        startedAt: {
          gte: monthAgo
        },
        tenantId
      }
    }),
    prisma.agentExecution.count({
      where: {
        organizationId,
        startedAt: {
          gte: previousMonthStart,
          lt: monthAgo
        },
        tenantId
      }
    }),
    prisma.invoice.aggregate({
      _count: {
        _all: true
      },
      _sum: {
        amountPaidCents: true
      },
      where: {
        createdAt: {
          gte: monthAgo
        },
        organizationId,
        status: "paid",
        tenantId
      }
    }),
    prisma.invoice.aggregate({
      _count: {
        _all: true
      },
      _sum: {
        amountPaidCents: true
      },
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: monthAgo
        },
        organizationId,
        status: "paid",
        tenantId
      }
    }),
    prisma.invoice.count({
      where: {
        organizationId,
        status: "past_due",
        tenantId
      }
    }),
    prisma.membership.findFirst({
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      },
      where: {
        organizationId,
        role: {
          in: ["OWNER", "ADMIN"]
        }
      }
    }),
    getBillingSnapshot(organizationId, 3)
  ]);

  if (!organization) {
    throw new Error("DASHBOARD_ORGANIZATION_NOT_FOUND");
  }

  const plan = await prisma.subscription.findFirst({
    include: {
      plan: true
    },
    orderBy: {
      updatedAt: "desc"
    },
    where: {
      organizationId,
      tenantId
    }
  });

  return {
    activityWindow,
    customers,
    customerTotalCount,
    defaultOwnerName: defaultOwnerMembership?.user.name ?? "Equipe BirthHub",
    newCustomersCurrent,
    newCustomersPrevious,
    organization,
    paidInvoicesCurrent,
    paidInvoicesPrevious,
    pastDueInvoices,
    planMonthlyPriceCents: plan?.plan.monthlyPriceCents ?? 0,
    snapshot,
    workflowCurrent,
    workflowPrevious,
    agentCurrent,
    agentPrevious
  };
}

function buildFinanceRows(input: {
  creditBalanceCents: number;
  paidCurrentCents: number;
  paidCurrentCount: number;
  paidPreviousCents: number;
  pastDueInvoices: number;
  planMonthlyPriceCents: number;
  planName: string;
  planStatus: string | null;
}): FinanceItem[] {
  return [
    {
      delta: `${input.planName}${input.planStatus ? ` · ${input.planStatus}` : ""}`,
      label: "MRR",
      value: formatCurrencyFromCents(input.planMonthlyPriceCents)
    },
    {
      delta: formatDelta(input.paidCurrentCents, input.paidPreviousCents, "em receita"),
      label: "Receita 30d",
      value: formatCurrencyFromCents(input.paidCurrentCents)
    },
    {
      delta: `${input.paidCurrentCount} faturas pagas · ${input.pastDueInvoices} em atraso`,
      label: "Créditos",
      value: formatCurrencyFromCents(input.creditBalanceCents)
    }
  ];
}

export async function getDashboardMetrics(
  organizationId: string,
  tenantId: string
): Promise<DashboardMetrics> {
  const context = await loadOrganizationContext(organizationId, tenantId);

  return {
    finance: buildFinanceRows({
      creditBalanceCents: context.snapshot.creditBalanceCents,
      paidCurrentCents: context.paidInvoicesCurrent._sum.amountPaidCents ?? 0,
      paidCurrentCount: context.paidInvoicesCurrent._count._all ?? 0,
      paidPreviousCents: context.paidInvoicesPrevious._sum.amountPaidCents ?? 0,
      pastDueInvoices: context.pastDueInvoices,
      planMonthlyPriceCents: context.planMonthlyPriceCents,
      planName: context.snapshot.plan.name,
      planStatus: context.snapshot.status
    }),
    pipeline: [
      {
        stage: "Clientes ativos",
        trend: formatDelta(context.newCustomersCurrent, context.newCustomersPrevious, "clientes"),
        value: context.customerTotalCount
      },
      {
        stage: "Workflows 30d",
        trend: formatDelta(context.workflowCurrent, context.workflowPrevious, "execuções"),
        value: context.workflowCurrent
      },
      {
        stage: "Agentes 30d",
        trend: formatDelta(context.agentCurrent, context.agentPrevious, "execuções"),
        value: context.agentCurrent
      }
    ]
  };
}

export async function getDashboardAgentStatuses(
  organizationId: string,
  tenantId: string
): Promise<DashboardAgentStatuses> {
  const context = await loadOrganizationContext(organizationId, tenantId);
  const baseScore = clampScore(
    context.organization.healthScore -
      Math.min(context.activityWindow?.runFailures ?? 0, 25) -
      Math.min((context.activityWindow?.billingErrors ?? 0) * 2, 15)
  );

  const items = (context.customers.length > 0
    ? context.customers
    : [
        {
          metadata: null,
          name: context.organization.name
        }
      ]
  ).map((customer, index) => {
    const metadata = asObject(customer.metadata);
    const score = clampScore(
      readNumber(metadata, "healthScore") ??
        baseScore - index * 2 +
          Math.min(context.activityWindow?.activeUsers ?? 0, 10)
    );
    const nps = clampScore(readNumber(metadata, "nps") ?? score - 8);

    return {
      client: customer.name,
      nps,
      risk: riskFromScore(score),
      score
    };
  });

  return {
    healthScore: items
  };
}

export async function getDashboardRecentTasks(
  organizationId: string,
  tenantId: string
): Promise<DashboardRecentTasks> {
  const context = await loadOrganizationContext(organizationId, tenantId);
  const paidCurrentCents = context.paidInvoicesCurrent._sum.amountPaidCents ?? 0;
  const averageCustomerValueCents =
    context.customers.length > 0
      ? Math.round((context.planMonthlyPriceCents || paidCurrentCents || 0) / context.customers.length)
      : context.planMonthlyPriceCents || paidCurrentCents || 0;

  const contracts = context.customers.map((customer) => {
    const metadata = asObject(customer.metadata);

    return {
      customer: customer.name,
      mrr: formatCurrencyFromCents(
        readNumber(metadata, "mrrCents") ?? averageCustomerValueCents
      ),
      owner: readString(metadata, "ownerName") ?? context.defaultOwnerName,
      status: customer.status
    };
  });

  const groupedAttribution = new Map<string, number>();
  for (const customer of context.customers) {
    const metadata = asObject(customer.metadata);
    const source = readString(metadata, "source") ?? "direct";
    groupedAttribution.set(source, (groupedAttribution.get(source) ?? 0) + 1);
  }

  const attribution = Array.from(groupedAttribution.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([source, leads]) => ({
      cac: leads > 0 ? formatCurrencyFromCents(Math.round(paidCurrentCents / leads)) : formatCurrencyFromCents(0),
      conversion: context.customerTotalCount > 0 ? formatPercent(leads / context.customerTotalCount) : "0%",
      leads,
      source
    }));

  return {
    attribution,
    contracts
  };
}

export async function getDashboardBillingSummary(
  organizationId: string,
  tenantId: string
): Promise<DashboardBillingSummary> {
  const context = await loadOrganizationContext(organizationId, tenantId);

  return {
    finance: buildFinanceRows({
      creditBalanceCents: context.snapshot.creditBalanceCents,
      paidCurrentCents: context.paidInvoicesCurrent._sum.amountPaidCents ?? 0,
      paidCurrentCount: context.paidInvoicesCurrent._count._all ?? 0,
      paidPreviousCents: context.paidInvoicesPrevious._sum.amountPaidCents ?? 0,
      pastDueInvoices: context.pastDueInvoices,
      planMonthlyPriceCents: context.planMonthlyPriceCents,
      planName: context.snapshot.plan.name,
      planStatus: context.snapshot.status
    })
  };
}
