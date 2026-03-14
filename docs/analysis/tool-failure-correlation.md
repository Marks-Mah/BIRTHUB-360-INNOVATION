# Análise de Correlação: Falha de Tool vs Fail Rate do Agente

No modelo arquitetural de agentes do BirthHub360, os agentes não falham de forma monolítica. Uma falha de agente (job failed) é, na grande maioria das vezes, o sintoma visível de uma falha subjacente menor — especificamente, a falha de uma **Tool (Ferramenta)**.

Esta análise descreve como correlacionamos a saúde das ferramentas individuais com a degradação da taxa de sucesso global (Agent Fail Rate) para acelerar a resolução de incidentes.

## 1. O Padrão de Falha em Cascata (Cascading Failure)

Um agente é tão resiliente quanto a sua ferramenta mais fraca (The Weakest Link).

**A Anatomia da Correlação:**
1.  O agente `sales_bot` tenta invocar a tool `create_salesforce_lead`.
2.  A API do Salesforce está com problemas (Timeout ou retornando HTTP 503).
3.  A tool falha. O framework de tools (ADR-017) tenta o *retry* com backoff (ADR-015 Retry Policy).
4.  Após 3 retries, a tool retorna o erro definitivo para o agente: `"Ação falhou: Integração fora do ar."`
5.  O LLM tenta processar esse erro. Como o *System Prompt* instrui o agente a "Só responder depois de criar o lead", o agente fica "preso" e tenta invocar a ferramenta repetidamente ou, pior, lança uma `ToolExecutionError` não tratada que aborta o Job.
6.  **Conclusão:** O gráfico de "Agent Fail Rate" dispara.

## 2. A Métrica de Co-ocorrência (Pearson Correlation)

Para não perder tempo investigando o prompt do agente ou o banco de dados interno durante um incidente (ver `high-fail-rate-triage.md`), o sistema de observabilidade (ex: Datadog) mantém dashboards de correlação.

Calculamos o índice de correlação entre duas métricas em tempo real (Janela de 5 minutos):
*   **Métrica X:** `increase(agent_fail_rate_total[5m])`
*   **Métrica Y:** `increase(tool_error_rate_total{tool_name="create_salesforce_lead"}[5m])`

Se a correlação de Pearson for **> 0.85** durante um pico de falhas de agentes, o alerta dispara dizendo não apenas *"Agente caindo"*, mas *"Agente caindo PROVAVELMENTE DEVIDO à tool `create_salesforce_lead`"*.

## 3. O Problema das Ferramentas Silenciosas (Swallowed Errors)

Às vezes, a correlação é fraca ou negativa (a tool falha muito, mas o agente não falha). Isso ocorre quando a Tool implementa *Graceful Degradation* perfeitamente.

*   A tool falha, mas em vez de levantar uma exceção, ela retorna: `{"status": "error", "message": "Estou fora do ar"}`.
*   O LLM entende e responde ao usuário: *"Não consegui acessar o sistema agora, posso tentar mais tarde?"*.
*   O *Job* do agente termina com sucesso (HTTP 200), então o `Agent Fail Rate` permanece em 0%.
*   **Risco Oculto:** Embora o SLI técnico não caia, o valor de negócio (TTV) foi destruído. O usuário não teve o lead criado.

**Mitigação:**
Para medir a verdadeira saúde, precisamos de uma métrica de **"Business Goal Completion"**. O agente deve emitir um log customizado ao final do turno: `event="goal_achieved"` ou `event="goal_failed"`. Assim, correlacionamos a falha da Tool com a falha do *Objetivo*, não apenas com o *Crash* do worker.

## 4. Estratégias de Desacoplamento (Circuit Breakers)

Para evitar que uma tool "puxe" o agente para baixo:

1.  **Isolamento Rígido de Tools (Sandboxing):** Uma exceção dentro da tool *nunca* deve vazar (bubble up) e quebrar o loop do orquestrador (LangGraph). Ela deve ser sempre interceptada pelo `ToolNode` e convertida em uma mensagem (string) legível para o LLM.
2.  **Circuit Breaking Dinâmico:** O orquestrador rastreia o `tool_error_rate`. Se a tool X falhar 5 vezes seguidas para o mesmo tenant, o estado dela muda para `OPEN` (bloqueada). Chamadas subsequentes do agente a essa tool não farão sequer a requisição HTTP; o framework devolverá instantaneamente `"Circuito aberto: Ferramenta indisponível"`. Isso economiza tempo do worker, tokens do LLM e previne que a fila (`AgentQueueLatency`) encha enquanto os workers ficam ociosos esperando timeouts HTTP da API quebrada do parceiro.
