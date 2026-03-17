# ADR-017: Tools Framework - Sandboxing, Timeouts e Validação

## Status
Proposto

## Contexto
No ecossistema BirthHub360, "Tools" (Ferramentas) são as funções determinísticas que os Agentes (LLMs) chamam para interagir com o mundo real (bancos de dados, APIs de terceiros, sistema de arquivos). A execução de tools dita pela IA é inerentemente perigosa, exigindo um framework robusto que aplique restrições de tempo, memória, rede e validação estrita de dados antes que a execução ocorra e antes que o resultado seja devolvido ao agente.

Precisamos definir a arquitetura do "Tools Framework" para garantir que tools defeituosas ou maliciosas não comprometam o worker, exfiltrem dados (SSRF) ou estoirem os custos do tenant.

## Decisão

Adotaremos um framework de tools baseado em **Pydantic Models** com wrappers de **Sandboxing e Interceptação**, focado nos seguintes pilares:

### 1. Validação de I/O (Input/Output)
*   **Input Validation (Pré-Execução):** Todo payload gerado pelo LLM DEVE ser desserializado e validado contra um Schema Pydantic estrito. O LLM não pode passar chaves arbitrárias. Se a validação falhar, o framework intercepta o `ValidationError` e devolve um prompt corretivo ao LLM automaticamente, sem tentar executar a tool.
*   **Output Validation (Pós-Execução):** O retorno da tool DEVE aderir a um tamanho máximo (Max Payload Size, ex: 100KB). Retornos massivos causam falhas de OOM e exaustão de tokens no LLM. O framework truncará automaticamente respostas grandes ou as converterá em um resumo (via sumarizador interno) ou arquivo de referência estática (Object Storage) caso ultrapasse o limite.

### 2. Timeouts e Circuit Breakers (Resiliência)
*   **Hard Timeouts:** Toda invocação de tool é encapsulada em um bloco `asyncio.wait_for` (ou similar). Uma tool não pode travar a thread indefinidamente. O timeout será o definido no manifesto do agente (ADR-013), ou um valor default seguro (ex: 30 segundos).
*   **Circuit Breaker:** Ferramentas que falharem persistentemente (ex: 5 erros 5xx consecutivos numa API externa) entrarão em estado "Aberto". Chamadas subsequentes do agente a essa tool retornarão "Serviço temporariamente indisponível" imediatamente (Fast Failure), economizando tokens e tempo de execução.

### 3. Sandboxing de Rede e SSRF Protection
*   Qualquer ferramenta que faça requisições HTTP arbitrárias (onde a URL é parcial ou totalmente controlada pelo agente/usuário) DEVE usar o cliente HTTP encapsulado do framework (ex: uma instância de `httpx.AsyncClient` com proxies/filtros configurados).
*   O framework rejeitará nativamente DNS resolution para ranges de IPs privados/reservados (10.0.0.0/8, 127.0.0.0/8, 169.254.169.254) para prevenir Server-Side Request Forgery (SSRF) visando os metadados da nuvem ou infra interna (ver `docs/analysis/ssrf-via-tool-http.md`).

### 4. Telemetria e Custeio (Cost Tracking)
*   Toda execução emitirá um evento de log unificado (`ToolExecutionEvent`) contendo: `tool_name`, `tenant_id`, `agent_id`, `latency_ms`, `status` e um `cost_units` estimado (se a tool invocar APIs pagas de terceiros, como Serper.dev ou Twilio). Isso é fundamental para a análise de lucratividade (ver `docs/analysis/tool-cost-latency.md`).

## Consequências
*   **Positivas:** Redução massiva de falhas não-tratadas, proteção contra "Confused Deputy" e SSRF, resiliência contra indisponibilidades de parceiros.
*   **Negativas:** Aumenta a barreira para os desenvolvedores criarem novas tools, pois eles precisam definir rigorosamente os Schemas Pydantic, configurar timeouts adequados e tratar exceções dentro do padrão do framework.

## Referências
*   Item 4.5.J1 do Ciclo 4 (JULES)
*   [ADR-018: Policy Engine](./ADR-018-policy-engine.md) (Para regras de quais tools podem ser chamadas).