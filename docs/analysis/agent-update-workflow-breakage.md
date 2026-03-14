# Análise: Impacto de Atualizações de Agentes em Workflows

## Risco Fundamental
A engine do BirthHub360 gerencia o estado do LangGraph. Quando um Agent Pack é atualizado de forma síncrona, e um workflow de longo período (*Long-running Workflow*) já tem um estado parcial gravado, uma incompatibilidade de schema pode quebrar (Crash) o Worker em sua retomada (Resume).

## Cenário de Quebra
1. O Tenant cria o Workflow A que invoca o `search_crm_leads`.
2. O workflow atinge um *interrupt* e dorme (Suspend) esperando *Human-in-the-Loop* (HITL).
3. Uma versão Nova (Minor) é forçada no tenant, alterando o Pydantic base de `search_crm_leads` (ex.: adicionando um parâmetro default que a ferramenta downstream não suporta bem por conflito indireto).
4. O Workflow "acorda" e falha no Pydantic Parsing.

## Prevenção e Solução Adotada (Immutable Versioning)
Nós usamos *Immutable Versioning com Manual Migration* (ADR-023). Quando um workflow acorda, ele re-valida o estado com base na assinatura exata do pacote no momento de criação do workflow. Se uma nova versão chegou, ela só se aplica a *novas execuções*.
Execuções em andamento completam sua jornada na versão legada (*Frozen Manifest*).

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.2.J4-o3p4q5r6]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.2.J4-VALIDATED-j3k4l5m6]`
