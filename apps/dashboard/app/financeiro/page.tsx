import { finance } from "../../lib/dashboard-data";

export default function FinanceiroPage() {
  return (
    <main className="container">
      <h1>Visão Financeira</h1>
      <section className="metrics-grid">
        {finance.map((item) => (
          <article className="metric" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.delta}</small>
          </article>
        ))}
      </section>
    </main>
  );
}
