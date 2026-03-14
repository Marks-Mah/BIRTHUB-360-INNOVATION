# ADR-021: Padrão Resiliente de Conectores (Interface, Timeout, Retry e Circuit Breaker)

## Status
Aceito

## Contexto
O BirthHub360 interage com múltiplos sistemas de terceiros (Salesforce, Hubspot, Zendesk, Stripe, DocuSign). Ferramentas de agentes (tools) que fazem chamadas síncronas para essas APIs sem proteção adequada podem causar lentidão sistêmica, alto custo (tentando infinitamente em falhas do LLM) e instabilidade no StateGraph do LangGraph se os serviços externos ficarem indisponíveis.

## Decisão
Implementaremos um "Padrão Resiliente de Conectores" para envolver todas as chamadas de rede externas partindo de Agent Tools.

1.  **Interface Abstrata:** Tools nunca instanciam bibliotecas HTTP ou clientes externos diretamente no seu corpo. Elas devem chamar classes da camada de "Conectores" (`agents/shared/connectors/`). Exemplo: a `tool.search_lead` chama `SalesforceConnector.query()`.
2.  **Timeouts Rígidos:** Toda requisição HTTP externa terá um timeout explícito e curto (Default: 5 segundos para leitura, 15 segundos para escrita/upload de documentos).
3.  **Retry com Backoff Exponencial:** Utilizaremos a biblioteca `tenacity` do Python. Em caso de erros transientes (HTTP 429 Too Many Requests, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout), o conector tentará até 3 vezes (retry), com tempos de espera crescentes.
4.  **Circuit Breaker:** Para proteção contra quedas prolongadas, se um serviço falhar 5 vezes seguidas, o "circuito abre". O conector passará a retornar "Falha Imediata" (Fast Fail) sem tentar a rede por 60 segundos (Cooldown). Isso evita o acúmulo de requisições pendentes na fila do Agent Orchestrator.
5.  **Graceful Degradation:** Se o circuito abrir ou ocorrer timeout, o conector emitirá um `AgentToolError(message="Service Unavailable")`. A ferramenta tratará esse erro para responder ao LLM de forma limpa (ex: "No momento, o Salesforce está indisponível para esta pesquisa. Gostaria de prosseguir baseando-se no histórico anterior?").

## Consequências
*   Aumento da complexidade inicial para desenvolver novos conectores.
*   Prevenção de indisponibilidade em cascata ("Cascading Failures") no orchestrador.
*   Experiência mais previsível para o agente (o LLM não fica "preso" esperando um endpoint lento).
