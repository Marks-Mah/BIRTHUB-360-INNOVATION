# Estratégia de Propagação de Request ID

A rastreabilidade entre microserviços, frontend e logs é garantida através da propagação unificada do `x-request-id`.

## Fluxo de Propagação
1. **Frontend (Browser/Next.js):** Se o header `x-request-id` não for enviado pelo client, o Gateway (ou primeiro serviço a receber a requisição, ex: API) gera um UUID/CUID único.
2. **API/Microserviços:** Este ID é injetado no contexto assíncrono da requisição utilizando o `AsyncLocalStorage` do Node.js.
3. **Logger:** Todas as chamadas ao logger (Pino) recuperam automaticamente o `x-request-id` via `AsyncLocalStorage` e o anexam ao payload JSON do log.
4. **Comunicação Externa:** Chamadas subsequentes via fetch ou bibliotecas de mensageria (Redis/BullMQ) devem incluir o `x-request-id` nos headers ou metadados da mensagem.
