"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithSession } from "../../../lib/auth-client";
import "./analytics.css";

type ExecutivePayload = {
  metrics?: {
    arrCents: number;
    churnRate: number;
    mrrCents: number;
    trialConversionRate: number;
  };
};

type CohortPayload = {
  items?: Array<{
    cohortMonth: string;
    cohortSize: number;
    retainedM1: number;
    retainedM2: number;
    retainedM3: number;
  }>;
};

type ActivePayload = {
  metrics?: {
    dau: number;
    mau: number;
  };
};

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function toCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "USD",
    style: "currency"
  }).format(cents / 100);
}

export default function AdminAnalyticsPage() {
  const [executive, setExecutive] = useState<ExecutivePayload>({});
  const [cohort, setCohort] = useState<CohortPayload>({});
  const [active, setActive] = useState<ActivePayload>({});

  useEffect(() => {
    void Promise.all([
      fetchWithSession("/api/v1/analytics/executive"),
      fetchWithSession("/api/v1/analytics/cohort"),
      fetchWithSession("/api/v1/analytics/active-tenants")
    ])
      .then(async ([executiveResponse, cohortResponse, activeResponse]) => {
        if (executiveResponse.ok) {
          setExecutive((await executiveResponse.json()) as ExecutivePayload);
        }
        if (cohortResponse.ok) {
          setCohort((await cohortResponse.json()) as CohortPayload);
        }
        if (activeResponse.ok) {
          setActive((await activeResponse.json()) as ActivePayload);
        }
      })
      .catch(() => undefined);
  }, []);

  const lineHeights = useMemo(() => {
    const items = cohort.items ?? [];
    if (items.length === 0) {
      return [20, 35, 30, 46, 40];
    }

    const max = Math.max(1, ...items.map((item) => item.cohortSize));
    return items.map((item) => Math.max(8, Math.round((item.cohortSize / max) * 100)));
  }, [cohort.items]);

  return (
    <main className="analytics-shell">
      <section className="pricing-hero">
        <span className="badge">Backoffice SaaS</span>
        <h1>MRR, ARR, churn e conversao de trial</h1>
        <p>Dashboard executivo interno para acompanhar monetizacao e retencao por coorte.</p>
      </section>

      <section className="panel">
        <div className="stats-grid">
          <article>
            <span className="badge">MRR</span>
            <strong>{toCurrency(executive.metrics?.mrrCents ?? 0)}</strong>
          </article>
          <article>
            <span className="badge">ARR</span>
            <strong>{toCurrency(executive.metrics?.arrCents ?? 0)}</strong>
          </article>
          <article>
            <span className="badge">Churn rate</span>
            <strong>{toPercent(executive.metrics?.churnRate ?? 0)}</strong>
          </article>
          <article>
            <span className="badge">Trial conversion</span>
            <strong>{toPercent(executive.metrics?.trialConversionRate ?? 0)}</strong>
          </article>
          <article>
            <span className="badge">DAU / MAU</span>
            <strong>
              {(active.metrics?.dau ?? 0).toLocaleString("pt-BR")} / {(active.metrics?.mau ?? 0).toLocaleString("pt-BR")}
            </strong>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>Trend de coortes</h2>
        <div className="analytics-line" aria-hidden="true">
          {lineHeights.map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Retencao por coorte (M+1, M+2, M+3)</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Coorte</th>
                <th>Tamanho</th>
                <th>M+1</th>
                <th>M+2</th>
                <th>M+3</th>
              </tr>
            </thead>
            <tbody>
              {(cohort.items ?? []).map((item) => (
                <tr key={item.cohortMonth}>
                  <td>{new Date(item.cohortMonth).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</td>
                  <td>{item.cohortSize}</td>
                  <td>{item.retainedM1}</td>
                  <td>{item.retainedM2}</td>
                  <td>{item.retainedM3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

