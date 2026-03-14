"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Confetti from "react-confetti";

import "../../pricing/pricing.css";

export default function BillingSuccessPage() {
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    function updateSize() {
      setSize({
        height: window.innerHeight,
        width: window.innerWidth
      });
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <main className="pricing-shell">
      <Confetti height={size.height} width={size.width} recycle={false} numberOfPieces={360} />
      <section className="pricing-hero">
        <span className="badge">Pagamento confirmado</span>
        <h1>Assinatura ativada com sucesso</h1>
        <p>Seu plano premium ja esta liberado. Agora voce pode voltar ao dashboard e usar os recursos pagos.</p>
        <div className="hero-actions">
          <Link href="/settings/billing">Ir para Billing Settings</Link>
          <Link href="/billing">Voltar ao dashboard</Link>
        </div>
      </section>
    </main>
  );
}
