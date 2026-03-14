# RELEASE NOTES - v1.0.0 (BirthHub 360 GA)

## Visão Geral do Produto
O BirthHub360 atinge oficialmente a sua Versão 1.0 (General Availability). Esta versão consolida a arquitetura multi-tenant para orquestração de Agentes Autônomos baseados em LLM, com foco corporativo, isolamento rigoroso de dados (RLS), segurança de infraestrutura e governança de processos via um ecossistema de Marketplace (Packs).

A versão `v1.0.0` reflete o esforço integral de 10 ciclos de engenharia iterativa e auditorias de segurança conduzidos pelas equipes JULES e CODEX.

## Principais Features (Changelog Consolidado)

### 1. Motor de Orquestração (Workflow Engine)
*   **Stateful Agent Runs:** Persistência de estado assíncrona baseada em PostgreSQL (ADR-022), permitindo resiliência contra falhas, timeouts configuráveis e retentativas exponenciais.
*   **Controles de Robustez (Base Agent):** Rate limiting por tenant (janela de 60s), Circuit Breakers para falhas de chamadas a APIs de Tools, e gerenciamento automático de Context Window (truncamento de mensagens) para evitar OOM e aumento de custos.
*   **Execução Sandbox:** Proteção do Runtime com JWTs de vida curta (Short-Lived JWT) limitando privilégios horizontais e verticais por *run* de agente.

### 2. Multi-Tenancy e Segurança
*   **Isolamento RLS:** Row-Level Security implementada nativamente no banco de dados para impedir vazamento cruzado de dados entre Tenants (ADR-008).
*   **Infraestrutura de Chaves Públicas (PKI):** Implementação de uma CA Central para assinar digitalmente *Packs* distribuídos (ADR-029), mitigando ataques Man-in-the-Middle e injeção de malware no Marketplace.
*   **Proteção de Endpoint:** Webhooks de entrada (ex: Stripe) protegidos por verificação criptográfica HMAC SHA-256 (webhook-receiver).

### 3. Marketplace e Governança
*   **Agent Manifests (ADR-019):** Empacotamento declarativo via `manifest.yaml` definindo permissões explícitas (Whitelisting), inputs e versão SemVer.
*   **Políticas de Sideloading:** Controles de Quarentena, SAST e Whitelisting de rede para importação de "Packs Não Assinados" baseados em camadas (Free/Pro/Enterprise).
*   **Ciclo de Vida CI/CD:** Suporte a fluxos formais de promoção entre ambientes (Dev -> Staging -> Prod) para clientes Enterprise com Rollback imediato.

### 4. Compliance e Reporting (LGPD Ready)
*   **Arquitetura Zero Data Retention:** Acordos garantidos de não-treinamento com provedores LLM base. Ferramentas de exclusão via DSAR disponíveis para o Data Controller (Tenant).
*   **Métricas Executivas:** Dashboards configurados para medir Deflexão de Operadores Humanos, Horas Salvas e ROI financeiro em tempo real.
*   **Logs de Auditoria (Audit Trail):** Todas as transições de permissões, "Export de Packs" e chamadas críticas logadas no sistema para detecção de Insider Threats.

## Breaking Changes Confirmadas (v0 -> v1)
*   A API herdada `/api/v0/` inicia hoje seu período formal de depreciação (6 meses - ADR-030).
*   *Manifests* antigos sem a declaração obrigatória de *Network Egress* não poderão mais ser importados sem acionar o bloqueio do motor v1.
*   Execuções que ultrapassarem os limites do *Circuit Breaker* agora falham intencionalmente (Fail-Fast) em vez de causar *Timeout* na fila principal.

## Dívida Técnica Reconhecida (Post-Release)
Consulte o arquivo `docs/release/final_readiness_report_v1.md` para um mapeamento claro das otimizações secundárias (Nitpicks) que foram postergadas para a versão `v1.1`.
