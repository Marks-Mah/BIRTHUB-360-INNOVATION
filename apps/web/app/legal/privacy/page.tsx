export const dynamic = "force-static";

const sections = [
  {
    body: [
      "A BirthHub360 trata dados pessoais para autenticar usuarios, operar fluxos multi-tenant, emitir logs auditaveis e processar cobranca corporativa.",
      "Os dados sao usados apenas para entrega do servico contratado, seguranca operacional, cumprimento legal e suporte tecnico."
    ],
    title: "1. Finalidade do Tratamento"
  },
  {
    body: [
      "Coletamos dados cadastrais basicos, informacoes de sessao, metadados de tenant, eventos de faturamento e artefatos gerados por workflows.",
      "Credenciais sensiveis, segredos de integracao e chaves privadas nao entram nos exports de portabilidade e nao sao exibidos em interfaces publicas."
    ],
    title: "2. Categorias de Dados"
  },
  {
    body: [
      "A retencao padrao de logs operacionais e de auditoria segue o limite maximo de 180 dias em producao.",
      "Contas excluidas entram em fluxo de obfuscacao imediata e limpeza complementar, preservando apenas o minimo necessario para rastreabilidade legal e antifraude."
    ],
    title: "3. Retencao e Minimização"
  },
  {
    body: [
      "O titular pode exportar seus dados, solicitar exclusao de conta e revogar sessoes diretamente em Configuracoes > Privacidade.",
      "Solicitacoes de exclusao feitas por proprietarios do tenant tambem disparam cancelamento de faturamento ativo antes da anonimização local."
    ],
    title: "4. Direitos do Titular"
  },
  {
    body: [
      "Em producao, variaveis sensiveis devem ser injetadas em runtime por Secrets Manager ou Parameter Store.",
      "Conexoes com Postgres exigem sslmode=require, Redis deve usar TLS e a aplicacao opera com HSTS, CORS restrito e containers sem root."
    ],
    title: "5. Controles Tecnicos"
  }
];

export default function PrivacyPolicyPage() {
  return (
    <main style={{ display: "grid", gap: "1.5rem", margin: "0 auto", maxWidth: 920, padding: "2rem 1.5rem 3rem" }}>
      <header style={{ display: "grid", gap: "0.5rem" }}>
        <span className="badge">LGPD / Privacy</span>
        <h1 style={{ margin: 0 }}>Politica de Privacidade</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Documento publico e estatico para a release 1.0, com foco em operacao corporativa e
          compliance de producao.
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
