# Análise de Riscos Operacionais em Conectores (Falha de Serviços Terceiros)

Este documento analisa o impacto operacional que a falha de dependências externas (conector) gera sobre as capacidades do agente no BirthHub360 e determina as estratégias de mitigação.

## Cenários de Risco

### 1. Indisponibilidade Total ("Hard Outage" de APIs Terceiras)
*   **Descrição:** O Hubspot (CRM) ou o Stripe (Pagamentos) estão fora do ar (ex: retorno HTTP 503).
*   **Impacto no Agente (Grau: Crítico):** Agentes fortemente dependentes (ex: SDRAgent necessitando ler pipelines, AccountManagerAgent precisando gerar link de pagamento) ficarão impossibilitados de avançar no workflow principal.
*   **Modo de Falha Esperado (Silenciosa vs Explícita):** Erros críticos (`AgentToolError`) e o Circuit Breaker atuando. A falha será **Explícita**, notificando o usuário que o serviço subjacente falhou ("Não consegui buscar o lead porque o sistema CRM não responde").

### 2. Rate Limiting (HTTP 429) e Custo de Chamadas
*   **Descrição:** Um cliente executando um fluxo em lote (batch) faz com que o agente dispare 150 requests simultâneas contra o Salesforce, estourando a cota diária do tenant.
*   **Impacto no Agente (Grau: Alto):** O LLM, desprovido de contexto temporal sobre cotas, pode entrar em loop infinito de `Retry`, gerando alto gasto de Tokens e paralisando operações de leitura posteriores.
*   **Modo de Falha Esperado:** O conector deve interceptar o 429 e enviar ao LLM a string textual: "Limite de chamadas atingido (Rate Limit). Pause esta tarefa.".

### 3. Lentidão e Latência Elevada (Timeouts)
*   **Descrição:** Uma API governamental (ex: Receita Federal ou Consulta de Dados) demora mais de 30 segundos para retornar a situação cadastral.
*   **Impacto no Agente (Grau: Médio a Alto):** Bloqueio do fluxo de execução síncrono. Em plataformas cloud, timeouts de proxy (ex: NGINX / CloudRun 60s max) podem cortar a conexão inteira com o navegador do cliente final.
*   **Modo de Falha Esperado:** Timeout de Connector (Hard Limit 10s-15s). O agente informa o usuário: "A consulta de crédito está demorando além do esperado, prosseguirei o fluxo e trarei a resposta depois" (Design Assíncrono / Webhook).

## Graceful Degradation (Degradação Graciosa)

A principal premissa ao desenhar os templates e conectores não é evitar falhas externas, mas sim absorvê-las.
Se o sistema X falha, o agente deve:
1.  Documentar no histórico do LangGraph que a Tool de X falhou (com o motivo exato: "timeout", "rate limit", "503").
2.  Desviar seu raciocínio (System Prompt) para tentar extrair a informação via um plano alternativo (ex: "CRM falhou, tente buscar no cache interno" ou "Notifique o usuário final da falha e peça os dados manualmente").
