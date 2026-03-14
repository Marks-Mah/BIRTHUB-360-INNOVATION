import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div className="legal-footer__row">
        <strong>BirthHub360 v1.0</strong>
        <nav className="legal-footer__links" aria-label="Links legais">
          <Link href="/legal/privacy">Politica de Privacidade</Link>
          <Link href="/legal/terms">Termos de Uso</Link>
          <Link href="/settings/privacy">LGPD e Portabilidade</Link>
        </nav>
      </div>
      <p className="legal-footer__meta">
        Conteudo estatico publico para compliance, retencao maxima de logs em 180 dias e operacao
        de producao via secrets manager.
      </p>
    </footer>
  );
}
