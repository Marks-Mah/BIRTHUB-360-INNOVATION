"use client";

import Link from "next/link";
import { RealtimeBanner } from "../components/realtime-banner";
import { ExperienceLab } from "../components/experience-lab";
import { SessionActions } from "../components/session-actions";
import { PremiumCommandCenter } from "../components/premium-command-center";
import { useAgentStatuses, useBillingSummary, useMetrics } from "../lib/dashboard-hooks";

const cards = [
  { href: "/sales", title: "Sales OS", description: "Sistema operacional de vendas com IA (LDR, BDR, SDR, Closer)." },
  { href: "/pipeline", title: "🚀 Pipeline de Vendas", description: "Acompanhe evolução por etapa, volume e tendência." },
  { href: "/health-score", title: "💚 Health Score Board", description: "Monitore saúde de contas e risco de churn por cliente." },
  { href: "/financeiro", title: "💰 Visão Financeira", description: "MRR, churn, inadimplência e indicadores de receita." },
  { href: "/analytics", title: "📊 Analytics & Attribution", description: "Fontes de aquisição, conversão e eficiência de CAC." },
  { href: "/contratos", title: "📄 Gestão de Contratos", description: "Renovações, reajustes e responsáveis por conta." },
  { href: "/atividades", title: "🤖 Log de Atividades dos Agentes", description: "Feed operacional em tempo real com eventos dos agentes." },
];

export default function DashboardHome() {
  const metrics = useMetrics();
  const statuses = useAgentStatuses();
  const billing = useBillingSummary();

  const pipelineTotal = (metrics.data?.pipeline || []).reduce((total: number, item: { value: number }) => total + item.value, 0);
  const health = statuses.data?.healthScore || [];
  const avgHealth = health.length ? Math.round(health.reduce((total: number, item: { score: number }) => total + item.score, 0) / health.length) : 0;
  const headlineMrr = billing.data?.finance.find((item: { label: string; value: string }) => item.label === "MRR")?.value ?? "R$ 0";

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>✨ BirthHub 360 — Dashboard RevOps Ultra</h1>
          <p>Dados executivos sincronizados com a API principal em tempo real.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}><RealtimeBanner /><SessionActions /></div>
      </header>

      <section className="kpi-row" aria-label="Resumo executivo">
        <article className="metric"><span>Total no Pipeline</span><strong>{pipelineTotal}</strong><small>leads ativos</small></article>
        <article className="metric"><span>Health Score Médio</span><strong>{avgHealth}</strong><small>carteira atual</small></article>
        <article className="metric"><span>MRR Atual</span><strong>{headlineMrr}</strong><small>referência mensal</small></article>
      </section>

      <section className="grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="card card-link"><h2>{card.title}</h2><p>{card.description}</p></Link>
        ))}
      </section>

      <PremiumCommandCenter />
      <ExperienceLab />
    </main>
  );
}
