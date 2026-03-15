import {
  AgentStatus,
  InvoiceStatus,
  InviteStatus,
  MembershipStatus,
  Prisma,
  PrismaClient,
  QuotaResourceType,
  Role,
  SessionStatus,
  WorkflowExecutionStatus,
  WorkflowStepType,
  SubscriptionStatus,
  WorkflowTransitionRoute,
  WorkflowTriggerType,
  WorkflowStatus
} from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

type PlanSeed = {
  code: string;
  currency: string;
  description: string;
  limits: Record<string, unknown>;
  monthlyPriceCents: number;
  name: string;
  stripePriceId: string;
  stripeProductId: string;
  yearlyPriceCents: number;
};

type TenantSeed = {
  agents: string[];
  members: Array<{ email: string; name: string; role: Role }>;
  name: string;
  planCode: string;
  slug: string;
};

const plans: PlanSeed[] = [
  {
    code: "starter",
    currency: "usd",
    description: "Plano de entrada para times pequenos.",
    limits: {
      agents: 5,
      aiPrompts: 5_000,
      apiRequests: 5_000,
      emails: 2_500,
      features: {
        advancedAnalytics: false,
        agents: true,
        customerPortal: true,
        workflows: true
      },
      monthlyTokens: 250_000,
      storageGb: 100,
      workflows: 30
    },
    monthlyPriceCents: 4900,
    name: "Starter",
    stripePriceId: "price_starter_monthly",
    stripeProductId: "prod_starter",
    yearlyPriceCents: 47040
  },
  {
    code: "pro",
    currency: "usd",
    description: "Plano para operação em escala com automações avançadas.",
    limits: {
      agents: 25,
      aiPrompts: 25_000,
      apiRequests: 25_000,
      emails: 10_000,
      features: {
        advancedAnalytics: true,
        agents: true,
        customerPortal: true,
        workflows: true
      },
      monthlyTokens: 2_500_000,
      storageGb: 500,
      workflows: 250
    },
    monthlyPriceCents: 14900,
    name: "Pro",
    stripePriceId: "price_pro_monthly",
    stripeProductId: "prod_pro",
    yearlyPriceCents: 143040
  },
  {
    code: "enterprise",
    currency: "usd",
    description: "Plano enterprise com limites ilimitados e suporte prioritário.",
    limits: {
      agents: -1,
      aiPrompts: -1,
      apiRequests: -1,
      emails: -1,
      features: {
        advancedAnalytics: true,
        agents: true,
        customerPortal: true,
        prioritySupport: true,
        workflows: true
      },
      monthlyTokens: -1,
      storageGb: -1,
      workflows: -1
    },
    monthlyPriceCents: 49900,
    name: "Enterprise",
    stripePriceId: "price_enterprise_monthly",
    stripeProductId: "prod_enterprise",
    yearlyPriceCents: 479040
  }
];

const tenants: TenantSeed[] = [
  {
    agents: ["Alpha Concierge", "Alpha Revenue Scout", "Alpha Retention Radar"],
    members: [
      { email: "owner.alpha@birthub.local", name: "Alpha Owner", role: Role.OWNER },
      { email: "admin.alpha@birthub.local", name: "Alpha Admin", role: Role.ADMIN },
      { email: "ops.alpha@birthub.local", name: "Alpha Ops", role: Role.ADMIN },
      { email: "member.alpha@birthub.local", name: "Alpha Member", role: Role.MEMBER },
      { email: "success.alpha@birthub.local", name: "Alpha Success", role: Role.MEMBER },
      { email: "readonly.alpha@birthub.local", name: "Alpha Readonly", role: Role.READONLY }
    ],
    name: "BirthHub Alpha",
    planCode: "pro",
    slug: "birthhub-alpha"
  },
  {
    agents: ["Beta Concierge", "Beta Revenue Scout", "Beta Retention Radar"],
    members: [
      { email: "owner.beta@birthub.local", name: "Beta Owner", role: Role.OWNER },
      { email: "admin.beta@birthub.local", name: "Beta Admin", role: Role.ADMIN },
      { email: "ops.beta@birthub.local", name: "Beta Ops", role: Role.ADMIN },
      { email: "member.beta@birthub.local", name: "Beta Member", role: Role.MEMBER },
      { email: "success.beta@birthub.local", name: "Beta Success", role: Role.MEMBER },
      { email: "readonly.beta@birthub.local", name: "Beta Readonly", role: Role.READONLY }
    ],
    name: "BirthHub Beta",
    planCode: "starter",
    slug: "birthhub-beta"
  }
];

async function wipeDatabase(): Promise<void> {
  await prisma.jobSigningSecret.deleteMany();
  await prisma.loginAlert.deleteMany();
  await prisma.mfaChallenge.deleteMany();
  await prisma.mfaRecoveryCode.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.quotaUsage.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.stepResult.deleteMany();
  await prisma.workflowExecution.deleteMany();
  await prisma.workflowTransition.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.plan.deleteMany();
}

async function seedPlans(): Promise<Map<string, { id: string; limits: Record<string, unknown> }>> {
  const seeded = new Map<string, { id: string; limits: Record<string, unknown> }>();

  for (const plan of plans) {
    const record = await prisma.plan.upsert({
      create: {
        code: plan.code,
        currency: plan.currency,
        description: plan.description,
        limits: plan.limits as Prisma.InputJsonValue,
        monthlyPriceCents: plan.monthlyPriceCents,
        name: plan.name,
        stripePriceId: plan.stripePriceId,
        stripeProductId: plan.stripeProductId,
        yearlyPriceCents: plan.yearlyPriceCents
      },
      update: {
        active: true,
        currency: plan.currency,
        description: plan.description,
        limits: plan.limits as Prisma.InputJsonValue,
        monthlyPriceCents: plan.monthlyPriceCents,
        name: plan.name,
        stripePriceId: plan.stripePriceId,
        stripeProductId: plan.stripeProductId,
        yearlyPriceCents: plan.yearlyPriceCents
      },
      where: {
        code: plan.code
      }
    });

    seeded.set(plan.code, { id: record.id, limits: plan.limits });
  }

  return seeded;
}

function unlimitedToLargeNumber(value: unknown): number {
  if (typeof value !== "number") {
    return 0;
  }

  if (value < 0) {
    return 1_000_000;
  }

  return value;
}

type SeedWorkflowStep = {
  config: Record<string, unknown>;
  isTrigger?: boolean;
  key: string;
  name: string;
  type: WorkflowStepType;
};

type SeedWorkflowTransition = {
  route: WorkflowTransitionRoute;
  sourceKey: string;
  targetKey: string;
};

type SeedWorkflowDefinition = {
  cronExpression?: string;
  description: string;
  eventTopic?: string;
  name: string;
  status: WorkflowStatus;
  steps: SeedWorkflowStep[];
  transitions: SeedWorkflowTransition[];
  triggerConfig: Record<string, unknown>;
  triggerType: WorkflowTriggerType;
  webhookSecret?: string;
};

async function createWorkflowWithGraph(input: {
  organizationId: string;
  tenantId: string;
  workflow: SeedWorkflowDefinition;
}): Promise<{ id: string; status: WorkflowStatus }> {
  const workflow = await prisma.workflow.create({
    data: {
      cronExpression: input.workflow.cronExpression ?? null,
      definition: {
        nodes: input.workflow.steps.map((step) => ({
          config: step.config,
          key: step.key,
          name: step.name,
          type: step.type
        })),
        transitions: input.workflow.transitions
      } as Prisma.InputJsonValue,
      description: input.workflow.description,
      eventTopic: input.workflow.eventTopic ?? null,
      name: input.workflow.name,
      organizationId: input.organizationId,
      publishedAt: input.workflow.status === WorkflowStatus.PUBLISHED ? new Date() : null,
      status: input.workflow.status,
      tenantId: input.tenantId,
      triggerConfig: input.workflow.triggerConfig as Prisma.InputJsonValue,
      triggerType: input.workflow.triggerType,
      webhookSecret: input.workflow.webhookSecret ?? null
    }
  });

  const stepIdByKey = new Map<string, string>();

  for (const step of input.workflow.steps) {
    const createdStep = await prisma.workflowStep.create({
      data: {
        config: step.config as Prisma.InputJsonValue,
        isTrigger: step.isTrigger ?? false,
        key: step.key,
        name: step.name,
        onError: "STOP",
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: step.type,
        workflowId: workflow.id
      }
    });

    stepIdByKey.set(step.key, createdStep.id);
  }

  await Promise.all(
    input.workflow.transitions.map((transition) =>
      prisma.workflowTransition.create({
        data: {
          organizationId: input.organizationId,
          route: transition.route,
          sourceStepId: stepIdByKey.get(transition.sourceKey)!,
          targetStepId: stepIdByKey.get(transition.targetKey)!,
          tenantId: input.tenantId,
          workflowId: workflow.id
        }
      })
    )
  );

  // Cria execução de exemplo para facilitar testes de debugger e histórico no E2E.
  const seededExecution = await prisma.workflowExecution.create({
    data: {
      organizationId: input.organizationId,
      status: WorkflowExecutionStatus.SUCCESS,
      tenantId: input.tenantId,
      triggerPayload: {
        seeded: true
      },
      triggerType: input.workflow.triggerType,
      workflowId: workflow.id
    }
  });

  const triggerStepKey = input.workflow.steps.find((step) => step.isTrigger)?.key;
  const triggerStepId = triggerStepKey ? stepIdByKey.get(triggerStepKey) : null;

  if (triggerStepId) {
    await prisma.stepResult.create({
      data: {
        attempt: 1,
        executionId: seededExecution.id,
        finishedAt: new Date(),
        input: {
          seeded: true
        } as Prisma.InputJsonValue,
        organizationId: input.organizationId,
        output: {
          seeded: true,
          tenantId: input.tenantId
        } as Prisma.InputJsonValue,
        outputSize: 64,
        status: "SUCCESS",
        stepId: triggerStepId,
        tenantId: input.tenantId,
        workflowId: workflow.id
      }
    });
  }

  return {
    id: workflow.id,
    status: workflow.status
  };
}

function buildTenantWorkflows(tenantId: string): SeedWorkflowDefinition[] {
  return [
    {
      description: "Fluxo de onboarding com trigger de webhook, espera e ação final HTTP.",
      name: "Onboarding Workflow",
      status: WorkflowStatus.PUBLISHED,
      steps: [
        {
          config: {
            expects: "user_created"
          },
          isTrigger: true,
          key: "trigger_webhook",
          name: "Webhook Trigger",
          type: WorkflowStepType.TRIGGER_WEBHOOK
        },
        {
          config: {
            channel: "email",
            message: "Bem-vindo(a) ao BirthHub 360!",
            to: "{{ trigger.output.email }}"
          },
          key: "send_welcome_email",
          name: "Send Welcome Email",
          type: WorkflowStepType.SEND_NOTIFICATION
        },
        {
          config: {
            duration_ms: 86_400_000
          },
          key: "wait_24h",
          name: "Wait 24h",
          type: WorkflowStepType.DELAY
        },
        {
          config: {
            body: {
              source: "workflow_onboarding",
              tenantId,
              userEmail: "{{ trigger.output.email }}"
            },
            method: "POST",
            timeout_ms: 2_500,
            url: "https://example.local/internal/followup"
          },
          key: "create_followup",
          name: "Create Follow-up Task",
          type: WorkflowStepType.HTTP_REQUEST
        }
      ],
      transitions: [
        {
          route: WorkflowTransitionRoute.ALWAYS,
          sourceKey: "trigger_webhook",
          targetKey: "send_welcome_email"
        },
        {
          route: WorkflowTransitionRoute.ALWAYS,
          sourceKey: "send_welcome_email",
          targetKey: "wait_24h"
        },
        {
          route: WorkflowTransitionRoute.ALWAYS,
          sourceKey: "wait_24h",
          targetKey: "create_followup"
        }
      ],
      triggerConfig: {
        method: "POST",
        path: "/webhooks/trigger/onboarding"
      },
      triggerType: WorkflowTriggerType.WEBHOOK,
      webhookSecret: createHash("sha256").update(`${tenantId}:onboarding-webhook`).digest("hex")
    },
    {
      cronExpression: "0 8 * * *",
      description: "Fluxo de alerta operacional diário com branch condicional.",
      name: "Alert Workflow",
      status: WorkflowStatus.PUBLISHED,
      steps: [
        {
          config: {
            cron: "0 8 * * *"
          },
          isTrigger: true,
          key: "trigger_cron",
          name: "Daily Trigger",
          type: WorkflowStepType.TRIGGER_CRON
        },
        {
          config: {
            method: "GET",
            timeout_ms: 2_500,
            url: "https://example.local/internal/health-summary"
          },
          key: "fetch_health",
          name: "Fetch Health Summary",
          type: WorkflowStepType.HTTP_REQUEST
        },
        {
          config: {
            operator: ">",
            path: "steps.fetch_health.output.failRate",
            value: 0.2
          },
          key: "check_fail_rate",
          name: "Check Fail Rate",
          type: WorkflowStepType.CONDITION
        },
        {
          config: {
            channel: "inapp",
            message: "Fail rate acima do limite no tenant {{ trigger.output.tenantId }}.",
            to: "ops@birthub.local"
          },
          key: "notify_ops",
          name: "Notify Ops",
          type: WorkflowStepType.SEND_NOTIFICATION
        },
        {
          config: {
            map: {
              observedAt: "{{ steps.fetch_health.output.checkedAt }}",
              status: "ok"
            }
          },
          key: "log_normal_state",
          name: "Log Normal State",
          type: WorkflowStepType.TRANSFORMER
        }
      ],
      transitions: [
        {
          route: WorkflowTransitionRoute.ALWAYS,
          sourceKey: "trigger_cron",
          targetKey: "fetch_health"
        },
        {
          route: WorkflowTransitionRoute.ALWAYS,
          sourceKey: "fetch_health",
          targetKey: "check_fail_rate"
        },
        {
          route: WorkflowTransitionRoute.IF_TRUE,
          sourceKey: "check_fail_rate",
          targetKey: "notify_ops"
        },
        {
          route: WorkflowTransitionRoute.IF_FALSE,
          sourceKey: "check_fail_rate",
          targetKey: "log_normal_state"
        }
      ],
      triggerConfig: {
        cron: "0 8 * * *",
        timezone: "America/Sao_Paulo"
      },
      triggerType: WorkflowTriggerType.CRON
    }
  ];
}

async function createTenant(
  seed: TenantSeed,
  planMap: Map<string, { id: string; limits: Record<string, unknown> }>
): Promise<void> {
  const selectedPlan = planMap.get(seed.planCode);

  if (!selectedPlan) {
    throw new Error(`Plan '${seed.planCode}' was not seeded.`);
  }

  const passwordHash = createHash("sha256").update("password123").digest("hex");
  const organization = await prisma.organization.create({
    data: {
      name: seed.name,
      planId: selectedPlan.id,
      settings: {
        locale: "pt-BR",
        timezone: "America/Sao_Paulo"
      },
      slug: seed.slug,
      stripeCustomerId: `cus_${seed.slug.replace(/-/g, "_")}`
    }
  });

  const users = await Promise.all(
    seed.members.map((member) =>
      prisma.user.create({
        data: {
          email: member.email,
          name: member.name,
          passwordHash
        }
      })
    )
  );

  await Promise.all(
    users.map((user, index) =>
      prisma.membership.create({
        data: {
          organizationId: organization.id,
          role: seed.members[index]?.role ?? Role.MEMBER,
          status: MembershipStatus.ACTIVE,
          tenantId: organization.tenantId,
          userId: user.id
        }
      })
    )
  );

  await Promise.all(
    users.map((user, index) =>
      prisma.session.create({
        data: {
          csrfToken: `${seed.slug}-${index + 1}-csrf`,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          organizationId: organization.id,
          refreshExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
          refreshTokenHash: createHash("sha256")
            .update(`${seed.slug}-${index + 1}-refresh`)
            .digest("hex"),
          status: SessionStatus.ACTIVE,
          tenantId: organization.tenantId,
          token: `${seed.slug}-${index + 1}-session`,
          userId: user.id
        }
      })
    )
  );

  await Promise.all(
    seed.agents.map((agentName, index) =>
      prisma.agent.create({
        data: {
          config: {
            channel: index === 0 ? "concierge" : index === 1 ? "growth" : "retention"
          },
          name: agentName,
          organizationId: organization.id,
          status: AgentStatus.ACTIVE,
          tenantId: organization.tenantId
        }
      })
    )
  );

  const workflows = await Promise.all(
    buildTenantWorkflows(organization.tenantId).map((workflow) =>
      createWorkflowWithGraph({
        organizationId: organization.id,
        tenantId: organization.tenantId,
        workflow
      })
    )
  );

  await Promise.all(
    Array.from({ length: 3 }, (_, index) =>
      prisma.customer.create({
        data: {
          email: `customer.${index + 1}.${seed.slug}@birthub.local`,
          metadata: {
            lifecycle: index === 0 ? "new" : index === 1 ? "active" : "renewal"
          },
          name: `${seed.name} Customer ${index + 1}`,
          organizationId: organization.id,
          status: index === 2 ? "at-risk" : "active",
          tenantId: organization.tenantId
        }
      })
    )
  );

  const subscription = await prisma.subscription.create({
    data: {
      currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
      organizationId: organization.id,
      planId: selectedPlan.id,
      status: SubscriptionStatus.active,
      stripeCustomerId: organization.stripeCustomerId,
      stripeSubscriptionId: `sub_${seed.slug.replace(/-/g, "_")}`,
      tenantId: organization.tenantId
    }
  });

  await Promise.all([
    prisma.paymentMethod.create({
      data: {
        brand: "visa",
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
        last4: "4242",
        organizationId: organization.id,
        stripePaymentMethodId: `pm_${seed.slug.replace(/-/g, "_")}`,
        tenantId: organization.tenantId
      }
    }),
    prisma.invoice.create({
      data: {
        amountDueCents: seed.planCode === "enterprise" ? 0 : 14900,
        amountPaidCents: seed.planCode === "enterprise" ? 0 : 14900,
        currency: "usd",
        hostedInvoiceUrl: `https://billing.stripe.com/invoice/${seed.slug}/latest`,
        invoicePdfUrl: `https://pay.stripe.com/invoice/${seed.slug}/latest.pdf`,
        organizationId: organization.id,
        periodEnd: new Date("2026-03-31T23:59:59.000Z"),
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        status: InvoiceStatus.paid,
        stripeInvoiceId: `in_${seed.slug.replace(/-/g, "_")}_001`,
        subscriptionId: subscription.id,
        tenantId: organization.tenantId
      }
    })
  ]);

  await Promise.all(
    [
      { metric: "tokens.input", quantity: 122_000 },
      { metric: "tokens.output", quantity: 88_400 },
      { metric: "workflow.runs", quantity: 46 }
    ].map((usage, index) =>
      prisma.usageRecord.create({
        data: {
          eventId: `${seed.slug}-usage-${index + 1}`,
          metadata: {
            source: "seed-script"
          },
          metric: usage.metric,
          organizationId: organization.id,
          quantity: usage.quantity,
          subscriptionId: subscription.id,
          tenantId: organization.tenantId
        }
      })
    )
  );

  await prisma.billingEvent.create({
    data: {
      organizationId: organization.id,
      payload: {
        note: "Seeded baseline billing event",
        status: "processed"
      },
      stripeEventId: `evt_${seed.slug.replace(/-/g, "_")}_bootstrap`,
      tenantId: organization.tenantId,
      type: "seed.subscription.created"
    }
  });

  const agentsLimit = unlimitedToLargeNumber(selectedPlan.limits.agents);
  const workflowsLimit = unlimitedToLargeNumber(
    selectedPlan.limits.workflows
  );
  const tokensLimit = unlimitedToLargeNumber(
    selectedPlan.limits.monthlyTokens
  );

  await Promise.all(
    [
      { limit: Math.max(5_000, tokensLimit), resourceType: QuotaResourceType.API_REQUESTS },
      { limit: Math.max(1_000, Math.floor(tokensLimit / 4)), resourceType: QuotaResourceType.AI_PROMPTS },
      { limit: Math.max(2_500, workflowsLimit * 15), resourceType: QuotaResourceType.EMAILS_SENT },
      { limit: Math.max(100, agentsLimit), resourceType: QuotaResourceType.STORAGE_GB },
      { limit: Math.max(10_000, workflowsLimit * 40), resourceType: QuotaResourceType.WORKFLOW_RUNS }
    ].map((quota, index) =>
      prisma.quotaUsage.create({
        data: {
          count: index * 10,
          limit: quota.limit,
          period: "MONTHLY-2026-03",
          resetAt: new Date("2026-04-01T00:00:00.000Z"),
          resourceType: quota.resourceType,
          tenantId: organization.tenantId
        }
      })
    )
  );

  await prisma.invite.create({
    data: {
      email: `invite.${seed.slug}@birthub.local`,
      expiresAt: new Date("2026-03-20T00:00:00.000Z"),
      invitedByUserId: users[0]?.id ?? null,
      organizationId: organization.id,
      role: Role.MEMBER,
      status: InviteStatus.PENDING,
      tenantId: organization.tenantId,
      token: `${seed.slug}-invite-token`
    }
  });

  await Promise.all(
    workflows.map((workflow) =>
      prisma.auditLog.create({
        data: {
          action: "workflow.seeded",
          actorId: users[0]?.id ?? null,
          diff: {
            status: workflow.status
          },
          entityId: workflow.id,
          entityType: "workflow",
          ip: "127.0.0.1",
          tenantId: organization.tenantId,
          userAgent: "seed-script/1.0"
        }
      })
    )
  );

  await prisma.jobSigningSecret.create({
    data: {
      organizationId: organization.id,
      secret: createHash("sha256").update(`${organization.tenantId}-job-secret`).digest("hex"),
      tenantId: organization.tenantId
    }
  });
}

async function main(): Promise<void> {
  await wipeDatabase();
  const seededPlans = await seedPlans();

  for (const tenant of tenants) {
    await createTenant(tenant, seededPlans);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
