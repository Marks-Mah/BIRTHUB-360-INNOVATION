# Agent Registry, Versioning & Execution Architecture

Conforme especificações do Ciclo 4, o Registro de Agentes, Controle de Versões e Execução de filas estão definidos sob as seguintes diretrizes:

## 1. Agent Registry & Versionamento
*   **Versionamento SemVer (Semantic Versioning):** É obrigatório o uso estrito do SemVer (ex: `1.0.0`) para qualquer modificação do manifesto. Breaking changes sobem o *Major* (vide ADR-030).
*   **Integridade do Manifesto (Hash SHA256):** O DB deve salvar e vincular obrigatoriamente um hash SHA256 calculando em cima do payload do `manifest.yaml` para garantir integridade.
*   **Logs Não-Destrutivos (Imutabilidade):** Rejeitar PRs ou implementações do CODEX ou outros contribuidores em que o *Rollback* de uma versão cause a exclusão ou corrupção de logs e históricos da versão anterior. A auditoria deve sempre preservar todo o ciclo de vida.

## 2. PlanExecutor & Queues
*   **Arquitetura BullMQ Nivelada:** Todas as execuções assíncronas de Agentes usam BullMQ distribuído em **3 níveis de prioridade**: `High`, `Normal`, e `Low` dependendo da criticidade e SLA do Tenant.
*   **Idempotência Obrigatória:** Como as filas podem ter processamento *at-least-once*, o motor (`PlanExecutor`) exige Idempotência. Deve-se obrigar o uso de um "Cache Lock" (no Redis) na primeira fase de planejamento/execução para evitar loops infinitos ou múltiplas execuções de faturamento pelo Stripe.
*   **Robustez e Retry:** O PlanExecutor suporta *retry mechanism* automático e programático, utilizando *exponential backoff* para falhas transitórias, sendo revisto estritamente na revisão de código do CODEX.