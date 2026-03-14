"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithSession, getStoredSession } from "../../../lib/auth-client";

type RiskItem = {
  activeUsers30d: number;
  agentRuns30d: number;
  arrCents: number;
  billingErrors30d: number;
  healthScore: number;
  organizationId: string;
  slug: string;
  status: string | null;
  tenantId: string;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "USD",
    style: "currency"
  }).format(cents / 100);
}

export default function CustomerSuccessRiskPage() {
  const session = useMemo(() => getStoredSession(), []);
  const [items, setItems] = useState<RiskItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    void fetchWithSession("/api/v1/analytics/cs-risk", {
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar contas em risco (${response.status}).`);
        }

        const payload = (await response.json()) as {
          items: RiskItem[];
        };

        setItems(
          (payload.items ?? []).slice().sort((left, right) => {
            if (right.arrCents !== left.arrCents) {
              return right.arrCents - left.arrCents;
            }

            return left.healthScore - right.healthScore;
          })
        );
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Falha ao carregar contas em risco."
        );
      });
  }, [session]);

  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        margin: "0 auto",
        maxWidth: 1180,
        padding: "1.5rem"
      }}
    >
      <section className="hero-card">
        <span className="badge">CS Risk Radar</span>
        <h1>Contas em risco ordenadas por ARR e score</h1>
        <p style={{ marginBottom: 0 }}>
          Priorizacao para retencao cruzando risco de churn, falhas de billing e atividade recente.
        </p>
      </section>

      <section className="panel">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Conta</th>
                <th>ARR</th>
                <th>Health Score</th>
                <th>Usuarios 30d</th>
                <th>Runs 30d</th>
                <th>Billing Errors</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7}>{error ?? "Nenhuma conta carregada."}</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.organizationId}>
                    <td>
                      <strong>{item.slug}</strong>
                      <div style={{ color: "var(--muted)" }}>{item.tenantId}</div>
                    </td>
                    <td>{formatCurrency(item.arrCents)}</td>
                    <td>
                      <strong
                        style={{
                          color: item.healthScore < 40 ? "#9b2f2f" : "#1f7a1f"
                        }}
                      >
                        {item.healthScore}
                      </strong>
                    </td>
                    <td>{item.activeUsers30d}</td>
                    <td>{item.agentRuns30d}</td>
                    <td>{item.billingErrors30d}</td>
                    <td>{item.status ?? "sem assinatura"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

