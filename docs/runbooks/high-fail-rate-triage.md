# Runbook: Triagem de Agente com Alta Taxa de Falha (High Fail Rate)

Este runbook orienta o engenheiro On-Call a diagnosticar e mitigar incidentes onde um ou mais agentes apresentam um aumento repentino na taxa de falha (Fail Rate) a níveis que consomem o Error Budget (Ver `docs/performance/sli-error-budget.md`).

**Objetivo de Triagem:** Encontrar a causa-raiz (Root Cause) em menos de **10 minutos**.

**Gatilhos Típicos (Alertas):**
*   `AgentFailRateSpike > 5% nos últimos 15m`
*   `ToolErrorRateHigh > 10%`
*   `P95Latency > Threshold` (se acompanhado de timeouts).

---

## Passo 1: Isolar o Raio de Impacto (T0 a T+2 min)

A primeira pergunta a responder é: *A plataforma toda está quebrando ou é apenas um Agente / Tenant específico?*

1.  **Abra o Dashboard Principal de Agentes (Grafana/Datadog):**
    *   Verifique o gráfico `Fail Rate by Tenant`.
    *   **Cenário A (Global):** Todos os tenants mostram uma subida nos erros. (Ir para o Passo 2).
    *   **Cenário B (Localizado):** Apenas o Tenant ID `X` ou apenas o Agente de nome `support_triage` está falhando. (Ir para o Passo 3).

## Passo 2: Investigação Global (Falha Sistêmica) (T+2 a T+5 min)

Se o problema afeta toda a plataforma, a causa é geralmente infraestrutura ou provedor.

1.  **Status do LLM:** Acesse status.openai.com ou status.anthropic.com. Se eles estiverem caídos, não há o que fazer além de atualizar a Status Page do BirthHub360 (Comunicar os clientes).
2.  **Status do Banco de Dados:** O Vector DB (Pinecone/pgvector) ou o Redis estão com limite de conexões estouradas ou OOM? Se o banco de memória efêmera cair, nenhum agente consegue prosseguir (Crash Loop).
3.  **Deploy Recente:** Houve um deploy do `Agent Core` ou do `Orchestrator` nos últimos 30 minutos? Se sim, **faça o Rollback imediato**. Não perca tempo debubando código em produção.

## Passo 3: Investigação Localizada (Falha de Agente/Tenant) (T+2 a T+7 min)

Se a falha afeta apenas um agente (`sales_bot` do Tenant Y):

1.  **Filtrar Logs por Evento de Erro:**
    Execute a seguinte query no sistema de logs (Kibana/Datadog):
    `event:"agent_run_failed" AND tenant_id:"Y" AND agent_name:"sales_bot"`
2.  **Identificar a Exceção Predominante (Exception Trace):**
    *   **`ToolExecutionError (Tool: Salesforce)`:** O agente está falhando porque a API do Salesforce do cliente expirou o token OAuth ou o cliente atingiu o rate limit do plano deles.
        *   **Ação:** Notificar Customer Success para contatar o cliente. A plataforma está funcionando corretamente.
    *   **`PromptInjectionError` ou `OutputParseError`:** O LLM começou a devolver formatos estranhos (ex: Markdown em vez de JSON) devido a um prompt ruim.
        *   **Ação:** Verifique o histórico de auditoria (Policy de Edição de Prompt). O Admin do tenant fez um update de prompt hoje? Se sim, ensine o CS a usar a ferramenta de "One-Click Rollback" no Agent Studio.
    *   **`PolicyViolationError (Denied by Rule X)`:** O Policy Engine está bloqueando a chamada.
        *   **Ação:** Verificar se houve alteração na hierarquia de permissões ou se o plano do cliente foi rebaixado (dunning / downgrade automático) por falta de pagamento.

## Passo 4: Triagem de Ferramenta Defeituosa (Tool Failure) (T+7 a T+10 min)

Conforme a análise (`tool-failure-correlation.md`), a falha de uma tool pode mascarar o erro do agente.

1.  Se o erro apontar para uma Tool Interna (ex: `generate_pdf_report`) que foi atualizada recentemente, o desenvolvedor (ou mantenedor da tool) pode ter introduzido uma quebra de contrato (Breaking Change) não documentada no ADR-014.
2.  **Mitigação Imediata:** O On-Call deve usar o **Circuit Breaker Manual**:
    ```bash
    birthhub-cli feature-flag disable --tool generate_pdf_report --reason "Incident INC-123"
    ```
    Isso forçará a tool a falhar rapidamente ("Tool temporariamente desligada"), permitindo que o LLM do agente peça desculpas ao usuário em vez de travar o workflow completo com um timeout ou erro não tratado.

## Passo 5: Escalonamento
Se aos 10 minutos a causa raiz não for encontrada e a plataforma global continuar com `FailRate > 5%`:
1.  Acione o Engenheiro Principal (Agent Core Tech Lead) via PagerDuty.
2.  Inicie a Sala de Crise (War Room) no Google Meet/Zoom.
3.  Atualize a Status Page (Investigating).
