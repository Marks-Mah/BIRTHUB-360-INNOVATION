# Auditoria de Implementação: Arquitetura (ADRs) vs. Realidade

## 1. Objetivo da Auditoria
Ao longo da construção do BirthHub360, decisões críticas de design do sistema foram documentadas na forma de Architectural Decision Records (ADRs).
O objetivo deste documento (Gate do Ciclo 10) é cruzar a teoria (o que foi escrito nos ADRs) com a prática (o código em `master`), verificando se não houve "Drift" (desvio arquitetural) não documentado.

## 2. Resultado da Verificação dos ADRs Críticos

### ADR-008: Shared Schema with Row-Level Security (RLS)
*   **Decisão:** Utilizar PostgreSQL com RLS para isolar logicamente os Tenants sem precisar de dezenas de bancos separados.
*   **Status de Implementação:** ✅ ALINHADO. Os testes E2E e a inspeção das migrações do banco (Prisma/SQL) confirmam que as policies de RLS estão ativas (ex: `current_setting('app.current_tenant_id')`). O *Safety Net* de banco está rodando como projetado.

### ADR-015: Hybrid Queue Approach (Tenant vs Shared)
*   **Decisão:** Ter filas de roteamento separadas para tenants de alto tráfego para evitar a síndrome do "Noisy Neighbor" e manter o SLO dos tenants Free em uma fila genérica.
*   **Status de Implementação:** ✅ ALINHADO. O worker de filas consegue instanciar workers dedicados baseados nas *tags* do *Job*, satisfazendo a priorização exigida para contas Enterprise.

### ADR-016: Two-Layer Agent Memory (Ephemeral + Persistent)
*   **Decisão:** Usar memória efêmera (curto prazo para o fluxo atual) e memória persistente em Vector DB / KV store para contexto de longo prazo.
*   **Status de Implementação:** ⚠️ ALINHADO PARCIALMENTE. A persistência PostgreSQL via *LangGraph Checkpointer* cobre primariamente a memória efêmera e o estado da conversação. O RAG (Vector DB) está implementado no nível das ferramentas (Tools), mas a "memória de longo prazo auto-gerenciada pelo agente" requer chamadas explícitas. Atende aos requisitos, mas o design no código é mais simples que o papel. (Aceitável para a v1).

### ADR-019: Declarative Agent Manifests
*   **Decisão:** Packs devem ser configurados como código (`manifest.yaml`) usando SemVer e explicitando privilégios.
*   **Status de Implementação:** ✅ ALINHADO. A importação/exportação e todo o fluxo de curadoria do ciclo 10 dependem estritamente dessa estrutura baseada em código e validação de *schema*.

### ADR-022: Stateful Workflow Execution (Persist Before Transition)
*   **Decisão:** O orquestrador salva a saída de cada *node* (passo) no banco antes de prosseguir, permitindo pausa, *handoff* humano e *retries* de falhas locais.
*   **Status de Implementação:** ✅ ALINHADO. A implementação do LangGraph atende nativamente esse comportamento utilizando o Checkpointer para Postgres.

### ADR-029: Central PKI for Manifests (Marketplace Signatures)
*   **Decisão:** Uso de Autoridade Certificadora Centralizada (KMS AWS) para assinar manifests do Marketplace.
*   **Status de Implementação:** ✅ ALINHADO. A infraestrutura e as políticas de enforcement por plano (Strict/Warn) de packs não assinados foram definidas e o *pipeline* está apto a verificar os hashes criptográficos.

### ADR-030: Breaking Changes Policy (6 Months Deprecation)
*   **Decisão:** Contrato de suporte e *sunsetting* demorado para proteger integrações de clientes.
*   **Status de Implementação:** ✅ ALINHADO. A documentação jurídica e os guias de processo de suporte (`version_zero_sla.md`) ativam esta cláusula para a transição v0 -> v1 que ocorre hoje.

## 3. Conclusão Final (Arquitetura)
Não foi detectado nenhum desvio crítico "Shadow IT" nas práticas fundamentais de engenharia da versão 1.0. A ponte entre o design desenhado (ADRs) e o entregue está estruturalmente sólida.
