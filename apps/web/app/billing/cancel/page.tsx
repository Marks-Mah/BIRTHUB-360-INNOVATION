import Link from "next/link";

import "../../pricing/pricing.css";

export default function BillingCancelPage() {
  return (
    <main className="pricing-shell">
      <section className="pricing-hero">
        <span className="badge">Checkout cancelado</span>
        <h1>Nenhuma cobranca foi realizada</h1>
        <p>
          Voce pode revisar os planos novamente, atualizar os dados de pagamento e tentar quando quiser.
        </p>
        <div className="hero-actions">
          <Link href="/pricing">Voltar para pricing</Link>
          <Link href="/settings/billing">Ir para Billing Settings</Link>
        </div>
      </section>
    </main>
  );
}
