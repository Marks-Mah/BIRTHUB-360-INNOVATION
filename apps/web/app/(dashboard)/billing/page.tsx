const quotaCards = [
  { current: 742, label: "AI prompts", limit: 1000 },
  { current: 1860, label: "Emails enviados", limit: 2500 },
  { current: 3120, label: "Requests API", limit: 5000 }
];

const trendHeights = [32, 48, 60, 58, 76, 84, 92];

export default function BillingPage() {
  return (
    <>
      <section className="hero-card">
        <span className="badge">Quota awareness</span>
        <h1>Consumo vs cota do tenant ativo</h1>
        <p>
          Painel pronto para integrar com o endpoint cursor-based de quotas, exibindo progresso do
          plano vigente e tendência de uso.
        </p>
      </section>

      <section className="quota-grid">
        {quotaCards.map((quota) => {
          const percent = Math.min(100, Math.round((quota.current / quota.limit) * 100));

          return (
            <article className="quota-card" key={quota.label}>
              <span className="badge">{quota.label}</span>
              <h2>
                {quota.current} / {quota.limit}
              </h2>
              <div className="meter" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              <p>{percent}% do plano usado no período atual.</p>
            </article>
          );
        })}
      </section>

      <section className="trend-card">
        <h2>Tendência dos últimos 7 dias</h2>
        <div className="trend-bars" aria-hidden="true">
          {trendHeights.map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>
    </>
  );
}
