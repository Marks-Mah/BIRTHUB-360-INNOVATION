"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithSession } from "../../lib/auth-client";
import "./pricing.css";

type Plan = {
  code: string;
  description?: string | null;
  id: string;
  limits: Record<string, unknown>;
  monthlyPriceCents: number;
  name: string;
};

const fallbackPlans: Plan[] = [
  {
    code: "starter",
    description: "Perfeito para iniciar operacoes com automacoes essenciais.",
    id: "starter",
    limits: {
      agents: 5,
      features: {
        advancedAnalytics: false,
        customerPortal: true
      },
      workflows: 30
    },
    monthlyPriceCents: 4900,
    name: "Starter"
  },
  {
    code: "professional",
    description: "Escala comercial com mais agentes, fluxos e insights.",
    id: "professional",
    limits: {
      agents: 25,
      features: {
        advancedAnalytics: true,
        customerPortal: true
      },
      workflows: 250
    },
    monthlyPriceCents: 14900,
    name: "Professional"
  },
  {
    code: "enterprise",
    description: "Governanca enterprise, limites ilimitados e suporte prioritario.",
    id: "enterprise",
    limits: {
      agents: -1,
      features: {
        advancedAnalytics: true,
        customerPortal: true,
        prioritySupport: true
      },
      workflows: -1
    },
    monthlyPriceCents: 49900,
    name: "Enterprise"
  }
];

function toCurrency(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "USD",
    style: "currency"
  }).format(valueInCents / 100);
}

function readableLimit(value: unknown): string {
  if (typeof value !== "number") {
    return "Nao definido";
  }

  if (value < 0) {
    return "Ilimitado";
  }

  return String(value);
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [yearly, setYearly] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/billing/plans")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { items?: Plan[] };
        if (Array.isArray(payload.items) && payload.items.length > 0) {
          setPlans(payload.items);
        }
      })
      .catch(() => undefined);
  }, []);

  const sortedPlans = useMemo(
    () => plans.slice().sort((a, b) => a.monthlyPriceCents - b.monthlyPriceCents),
    [plans]
  );

  async function startCheckout(planId: string) {
    setLoadingPlanId(planId);

    try {
      const response = await fetchWithSession("/api/v1/billing/checkout", {
        body: JSON.stringify({ planId }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { url?: string };
      if (payload.url) {
        window.location.href = payload.url;
      }
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <main className="pricing-shell">
      <section className="pricing-hero">
        <span className="badge">Pricing</span>
        <h1>Planos para crescer sem travar sua operacao</h1>
        <p>
          Compare limites, recursos e custos com toggle mensal/anual (20% de desconto no anual).
        </p>
        <div className="pricing-toggle" role="group" aria-label="Periodo de cobranca">
          <button
            className={!yearly ? "pricing-toggle-active" : ""}
            type="button"
            onClick={() => setYearly(false)}
          >
            Mensal
          </button>
          <button
            className={yearly ? "pricing-toggle-active" : ""}
            type="button"
            onClick={() => setYearly(true)}
          >
            Anual (-20%)
          </button>
        </div>
      </section>

      <section className="pricing-grid">
        {sortedPlans.map((plan) => {
          const monthly = plan.monthlyPriceCents;
          const yearlyEquivalent = Math.round(monthly * 12 * 0.8);
          const displayPrice = yearly ? yearlyEquivalent : monthly;
          const features =
            typeof plan.limits.features === "object" && plan.limits.features
              ? (plan.limits.features as Record<string, unknown>)
              : {};

          return (
            <article className="pricing-card" key={plan.id}>
              <h2>{plan.name}</h2>
              <p className="pricing-description">{plan.description}</p>
              <strong>{toCurrency(displayPrice)}</strong>
              <span className="pricing-period">{yearly ? "por ano" : "por mes"}</span>

              <ul>
                <li>{readableLimit(plan.limits.agents)} agentes</li>
                <li>{readableLimit(plan.limits.workflows)} workflows</li>
                <li>
                  Analytics avancado: {features.advancedAnalytics ? "Sim" : "Nao"}
                </li>
                <li>Portal self-service: {features.customerPortal ? "Sim" : "Nao"}</li>
              </ul>

              <button
                className="action-button"
                type="button"
                disabled={loadingPlanId === plan.id}
                onClick={() => {
                  void startCheckout(plan.id);
                }}
              >
                {loadingPlanId === plan.id ? "Abrindo checkout..." : "Escolher plano"}
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}

