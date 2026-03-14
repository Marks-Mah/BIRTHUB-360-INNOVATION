import { Prisma, SubscriptionStatus, prisma } from "@birthub/database";

type DateRange = {
  from: Date;
  to: Date;
};

export async function getUsageMetrics(range?: Partial<DateRange>) {
  const from = range?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = range?.to ?? new Date();
  const usage = await prisma.usageRecord.groupBy({
    _sum: {
      quantity: true
    },
    by: ["metric", "tenantId"],
    where: {
      occurredAt: {
        gte: from,
        lte: to
      }
    }
  });

  return usage.map((row) => ({
    metric: row.metric,
    quantity: row._sum.quantity ?? 0,
    tenantId: row.tenantId
  }));
}

export async function getExecutiveMetrics() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      plan: true
    }
  });
  const activeStatuses = new Set<SubscriptionStatus>([
    SubscriptionStatus.active,
    SubscriptionStatus.past_due,
    SubscriptionStatus.paused
  ]);
  const paying = subscriptions.filter((subscription) => activeStatuses.has(subscription.status));
  const mrr = paying.reduce((total, subscription) => total + subscription.plan.monthlyPriceCents, 0);
  const cancelled = subscriptions.filter(
    (subscription) => subscription.status === SubscriptionStatus.canceled
  ).length;
  const trial = subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.trial).length;
  const churnRate = subscriptions.length > 0 ? cancelled / subscriptions.length : 0;
  const trialConversionRate =
    trial + paying.length > 0 ? paying.length / (trial + paying.length) : 0;

  return {
    arrCents: mrr * 12,
    churnRate,
    mrrCents: mrr,
    trialConversionRate
  };
}

export async function getCohortMetrics() {
  const rows = await prisma.$queryRaw<
    Array<{
      cohort_month: Date;
      cohort_size: bigint;
      retained_m1: bigint;
      retained_m2: bigint;
      retained_m3: bigint;
    }>
  >(Prisma.sql`
    SELECT
      date_trunc('month', o."createdAt") AS cohort_month,
      COUNT(*) AS cohort_size,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM "workflow_executions" we
          WHERE we."tenantId" = o."tenantId"
            AND we."createdAt" >= date_trunc('month', o."createdAt") + interval '1 month'
            AND we."createdAt" < date_trunc('month', o."createdAt") + interval '2 month'
        )
      ) AS retained_m1,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM "workflow_executions" we
          WHERE we."tenantId" = o."tenantId"
            AND we."createdAt" >= date_trunc('month', o."createdAt") + interval '2 month'
            AND we."createdAt" < date_trunc('month', o."createdAt") + interval '3 month'
        )
      ) AS retained_m2,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM "workflow_executions" we
          WHERE we."tenantId" = o."tenantId"
            AND we."createdAt" >= date_trunc('month', o."createdAt") + interval '3 month'
            AND we."createdAt" < date_trunc('month', o."createdAt") + interval '4 month'
        )
      ) AS retained_m3
    FROM "organizations" o
    GROUP BY cohort_month
    ORDER BY cohort_month ASC
  `);

  return rows.map((row) => ({
    cohortMonth: row.cohort_month.toISOString(),
    cohortSize: Number(row.cohort_size),
    retainedM1: Number(row.retained_m1),
    retainedM2: Number(row.retained_m2),
    retainedM3: Number(row.retained_m3)
  }));
}

export async function exportBillingCsv(input: {
  from?: Date;
  to?: Date;
}) {
  const from = input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = input.to ?? new Date();
  const invoices = await prisma.invoice.findMany({
    orderBy: {
      createdAt: "asc"
    },
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      status: "paid"
    }
  });
  const headers = [
    "invoice_id",
    "tenant_id",
    "organization_id",
    "status",
    "amount_paid_cents",
    "currency",
    "created_at",
    "invoice_pdf_url"
  ];
  const rows = invoices.map((invoice) =>
    [
      invoice.id,
      invoice.tenantId,
      invoice.organizationId,
      invoice.status,
      invoice.amountPaidCents,
      invoice.currency,
      invoice.createdAt.toISOString(),
      invoice.invoicePdfUrl ?? ""
    ]
      .map((value) => JSON.stringify(String(value)))
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function getActiveTenantsMetrics() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [workflowDau, workflowMau, usageMau] = await Promise.all([
    prisma.workflowExecution.findMany({
      distinct: ["tenantId"],
      select: {
        tenantId: true
      },
      where: {
        startedAt: {
          gte: dayAgo
        }
      }
    }),
    prisma.workflowExecution.findMany({
      distinct: ["tenantId"],
      select: {
        tenantId: true
      },
      where: {
        startedAt: {
          gte: monthAgo
        }
      }
    }),
    prisma.usageRecord.findMany({
      distinct: ["tenantId"],
      select: {
        tenantId: true
      },
      where: {
        metric: {
          startsWith: "agent."
        },
        occurredAt: {
          gte: monthAgo
        }
      }
    })
  ]);
  const monthlyActive = new Set<string>([
    ...workflowMau.map((row) => row.tenantId),
    ...usageMau.map((row) => row.tenantId)
  ]);

  return {
    dau: workflowDau.length,
    mau: monthlyActive.size
  };
}

function uniqueTenantCount(values: string[]): number {
  return new Set(values).size;
}

export async function getCsRiskAccounts() {
  const organizations = await prisma.organization.findMany({
    include: {
      subscriptions: {
        include: {
          plan: true
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 1
      },
      tenantActivityWindows: {
        orderBy: {
          computedAt: "desc"
        },
        where: {
          windowDays: 30
        }
      }
    },
    orderBy: [
      {
        healthScore: "asc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });

  return organizations.map((organization) => {
    const subscription = organization.subscriptions[0] ?? null;
    const activity = organization.tenantActivityWindows[0] ?? null;
    const arrCents = (subscription?.plan.monthlyPriceCents ?? 0) * 12;

    return {
      activeUsers30d: activity?.activeUsers ?? 0,
      agentRuns30d: activity?.agentRuns ?? 0,
      arrCents,
      billingErrors30d: activity?.billingErrors ?? 0,
      healthScore: organization.healthScore,
      organizationId: organization.id,
      slug: organization.slug,
      status: subscription?.status ?? null,
      tenantId: organization.tenantId
    };
  });
}

export async function getQualityReport() {
  const negativeFeedback = await prisma.agentFeedback.findMany({
    include: {
      execution: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100,
    where: {
      rating: -1
    }
  });

  return negativeFeedback.map((item) => ({
    agentId: item.agentId,
    createdAt: item.createdAt.toISOString(),
    errorMessage: item.execution.errorMessage,
    executionId: item.executionId,
    expectedOutput: item.expectedOutput,
    notes: item.notes,
    rating: item.rating,
    status: item.execution.status,
    tenantId: item.tenantId
  }));
}

export async function getGlobalAgentPerformance() {
  const executions = await prisma.agentExecution.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      agentId: true,
      status: true
    },
    take: 5_000
  });

  const grouped = new Map<
    string,
    {
      failed: number;
      total: number;
    }
  >();

  for (const execution of executions) {
    const current = grouped.get(execution.agentId) ?? {
      failed: 0,
      total: 0
    };
    current.total += 1;

    if (execution.status === "FAILED") {
      current.failed += 1;
    }

    grouped.set(execution.agentId, current);
  }

  const items = Array.from(grouped.entries()).map(([agentId, value]) => ({
    agentId,
    failed: value.failed,
    failureRate: value.total > 0 ? value.failed / value.total : 0,
    total: value.total
  }));

  return {
    mostExecuted: items.slice().sort((left, right) => right.total - left.total).slice(0, 10),
    mostFailed: items.slice().sort((left, right) => right.failed - left.failed).slice(0, 10)
  };
}

export async function getMasterAdminDashboard() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [organizationsCount, subscriptions, workflowWau, workflowMau, agentWau, agentMau, usageRows] =
    await Promise.all([
      prisma.organization.count(),
      prisma.subscription.findMany({
        include: {
          plan: true
        }
      }),
      prisma.workflowExecution.findMany({
        distinct: ["tenantId"],
        select: {
          tenantId: true
        },
        where: {
          startedAt: {
            gte: weekAgo
          }
        }
      }),
      prisma.workflowExecution.findMany({
        distinct: ["tenantId"],
        select: {
          tenantId: true
        },
        where: {
          startedAt: {
            gte: monthAgo
          }
        }
      }),
      prisma.agentExecution.findMany({
        distinct: ["tenantId"],
        select: {
          tenantId: true
        },
        where: {
          startedAt: {
            gte: weekAgo
          }
        }
      }),
      prisma.agentExecution.findMany({
        distinct: ["tenantId"],
        select: {
          tenantId: true
        },
        where: {
          startedAt: {
            gte: monthAgo
          }
        }
      }),
      prisma.usageRecord.findMany({
        select: {
          metric: true,
          quantity: true
        },
        where: {
          occurredAt: {
            gte: monthAgo
          }
        }
      })
    ]);

  const activeStatuses = new Set<SubscriptionStatus>([
    SubscriptionStatus.active,
    SubscriptionStatus.past_due,
    SubscriptionStatus.paused
  ]);
  const paying = subscriptions.filter((subscription) => activeStatuses.has(subscription.status));
  const totalArrCents = paying.reduce(
    (total, subscription) => total + subscription.plan.monthlyPriceCents * 12,
    0
  );
  const llmUsageRows = usageRows.filter((row) =>
    row.metric.startsWith("agent.") ||
    row.metric.startsWith("llm.") ||
    row.metric.includes("openai") ||
    row.metric.includes("anthropic")
  );
  const llmCostRows = usageRows.filter((row) => row.metric.includes("cost"));

  return {
    llmApiCalls: llmUsageRows.reduce((total, row) => total + row.quantity, 0),
    llmCostCents: llmCostRows.reduce((total, row) => total + row.quantity, 0),
    totalArrCents,
    totalOrganizations: organizationsCount,
    wau: uniqueTenantCount([
      ...workflowWau.map((row) => row.tenantId),
      ...agentWau.map((row) => row.tenantId)
    ]),
    mau: uniqueTenantCount([
      ...workflowMau.map((row) => row.tenantId),
      ...agentMau.map((row) => row.tenantId)
    ])
  };
}
