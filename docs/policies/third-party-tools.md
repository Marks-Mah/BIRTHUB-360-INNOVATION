# Política de Integração de Tools de Terceiros (Third-Party Tools)

A plataforma BirthHub360 é altamente extensível. Agentes podem ser dotados de "Tools" (ferramentas) que se integram a APIs, serviços e provedores de software (SaaS) externos. No entanto, integrar serviços de terceiros (Third-Party) introduz riscos críticos de segurança, confiabilidade (uptime) e conformidade (LGPD/PCI-DSS) que não controlamos diretamente.

Esta política define os requisitos para avaliar, desenvolver e aprovar o uso de **Third-Party Tools** no ecossistema do Agent Core.

## 1. O que é uma Third-Party Tool?

Qualquer Tool (função executável pelo Agente) cujo *handler* (código-fonte) ou destino final faça uma chamada de rede para um domínio, IP ou infraestrutura que não seja controlada e operada diretamente pelo BirthHub360.

*   **Exemplos (Inclusos):** Integrações com Salesforce, Google Workspace, Stripe, Serasa, Serper.dev, Twilio, Slack.
*   **Exemplos (Excluídos):** Consultas ao nosso próprio PostgreSQL, chamadas a APIs internas (ex: `Billing Service`), acesso ao nosso Redis/Vector DB.

## 2. Processo de Avaliação (Due Diligence)

Antes de uma Third-Party Tool ser proposta ou iniciada o desenvolvimento, a equipe responsável deve realizar uma avaliação prévia focada em três pilares:

### A. Avaliação de Segurança (AppSec & Compliance)
1.  **Transporte:** O provedor suporta TLS 1.2+ para todas as requisições API?
2.  **Autenticação:** O provedor suporta métodos modernos de autenticação (ex: OAuth2, Tokens via Header Bearer/x-api-key, assinaturas HMAC)? Integrações baseadas em Basic Auth sem TLS ou cookies de sessão frágeis são proibidas.
3.  **Postura de Dados:** Para onde vão os dados enviados? O provedor possui certificações de conformidade adequadas (ex: SOC2, ISO 27001) compatíveis com a sensibilidade dos dados processados pelo nosso Agente?
    *   *Exemplo Prático:* Se a tool envia logs de transcrição médica, o provedor **deve** ser HIPAA compliant.
4.  **Uso de Dados:** O Termo de Uso do provedor garante que os dados enviados via API (ex: payloads de clientes) **NÃO** serão usados por eles para treinar seus próprios modelos fundacionais de IA (Zero Data Retention / No-Train policies)?

### B. Avaliação de Confiabilidade (Reliability & SLAs)
1.  **SLA Publicado:** Qual o SLA de *uptime* do serviço (ex: 99.9%)? Uma falha na tool de terceiros não pode derrubar o workflow principal do nosso Agente se não for mitigável.
2.  **Rate Limiting:** A API do provedor possui limites de taxa claros (ex: 100 requests/min)? O framework da Tool deve ser capaz de lidar (via retries/backoff) com erros `HTTP 429 Too Many Requests`.
3.  **Circuit Breaking:** O código da Tool deve prever falha rápida (timeout curto) caso a API de terceiros trave (hang), evitando esgotar o pool de workers do Agent Core (ver ADR-017).

### C. Avaliação de Custos (FinOps)
1.  Qual o modelo de precificação da API do parceiro? (ex: cobrança por chamada, por lote, por GB).
2.  Como esse custo (Categoria C no `tool-cost-latency.md`) será repassado ao nosso cliente final ou absorvido na margem de lucro do Tenant?
3.  É possível monitorar o custo gerado por essa Tool via logs unificados de eventos de custo?

## 3. Requisitos de Código e Desenvolvimento

Após a aprovação inicial (Due Diligence), o código da Tool DEVE cumprir:

1.  **Isolamento de Credenciais (Vault/Secrets):** Nenhuma chave de API de terceiros (Third-Party Secret) pode estar codificada (hardcoded) no repositório, no manifesto do agente ou nos logs.
    *   As credenciais devem vir do Gerenciador de Segredos do ambiente (ex: AWS Secrets Manager / HashiCorp Vault).
    *   O orquestrador as injeta no contexto da Tool (em memória) apenas durante a execução.
2.  **Máscara de PII em Logs:** Os payloads (requests e responses) trocados com o serviço externo devem ter dados sensíveis (PII, tokens) devidamente ofuscados (`[REDACTED]`) antes de serem escritos nos logs de observabilidade do Agent Core.
3.  **Timeouts Rígidos (Hard Limits):** Chamadas de rede para a Third-Party API devem envolver blocos `asyncio.wait_for` ou parâmetros de cliente HTTP (ex: `timeout=10.0`). O valor deve ser o menor possível para garantir a operação e falhar rápido se o provedor engasgar.

## 4. Aprovação e Inserção no Policy Engine

*   Toda Third-Party Tool deve ser registrada no **Agent Manifest** e no catálogo central de ferramentas.
*   **PR Review:** O Pull Request que introduz a Tool deve ser aprovado por:
    *   Engenharia (Código e Timeouts).
    *   Segurança/AppSec (Validação do SSRF e uso do Vault).
*   **Policy Engine:** Ferramentas de terceiros de alto impacto (ex: `charge_stripe_card`) devem ser configuradas no Policy Engine como `deny-by-default` (bloqueadas por padrão) e liberadas apenas para Tenants (planos) específicos que passaram por onboarding ou possuem as credenciais configuradas para aquele destino.
