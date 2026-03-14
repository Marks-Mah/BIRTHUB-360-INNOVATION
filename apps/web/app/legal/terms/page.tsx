export const dynamic = "force-static";

const sections = [
  {
    body: [
      "A BirthHub360 fornece software corporativo para automacao de workflows, execucao de agentes e operacao multi-tenant.",
      "O uso da plataforma pressupoe aceite destes termos por administradores e usuarios convidados do tenant."
    ],
    title: "1. Objeto"
  },
  {
    body: [
      "O cliente e responsavel pela legalidade dos dados enviados, pela gestao de acessos internos e pela configuracao adequada de agentes e integracoes.",
      "Nao e permitido utilizar a plataforma para fraude, envio abusivo de mensagens, violacao de privacidade ou bypass de controles de seguranca."
    ],
    title: "2. Responsabilidades do Cliente"
  },
  {
    body: [
      "A BirthHub360 executa medidas razoaveis de disponibilidade, observabilidade, isolamento de tenants e trilha de auditoria.",
      "Mudancas de plano, suspensao por inadimplencia e limites de uso seguem as regras de billing e grace period definidas para o tenant."
    ],
    title: "3. Prestacao do Servico"
  },
  {
    body: [
      "Conteudos gerados por agentes permanecem sob controle do tenant, respeitando os fluxos de retencao, exportacao e exclusao previstos na politica de privacidade.",
      "Integracoes terceiras continuam sujeitas aos termos dos respectivos provedores."
    ],
    title: "4. Dados e Propriedade"
  },
  {
    body: [
      "A release 1.0 utiliza CI/CD segregado por PR, staging e tags de producao, com gate obrigatorio de migracoes antes do deploy.",
      "A operacao de producao exige uso de dominios oficiais, TLS obrigatorio, segredos gerenciados externamente e imagens versionadas por SHA."
    ],
    title: "5. Operacao de Producao"
  }
];

export default function TermsPage() {
  return (
    <main style={{ display: "grid", gap: "1.5rem", margin: "0 auto", maxWidth: 920, padding: "2rem 1.5rem 3rem" }}>
      <header style={{ display: "grid", gap: "0.5rem" }}>
        <span className="badge">Public Terms</span>
        <h1 style={{ margin: 0 }}>Termos de Uso</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Termos formais e estaticos disponibilizados no footer publico da plataforma.
        </p>
      </header>

      {sections.map((section) => (
        <section
          key={section.title}
          style={{
            background: "rgba(255,255,255,0.82)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            display: "grid",
            gap: "0.75rem",
            padding: "1.25rem"
          }}
        >
          <h2 style={{ margin: 0 }}>{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} style={{ margin: 0 }}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
