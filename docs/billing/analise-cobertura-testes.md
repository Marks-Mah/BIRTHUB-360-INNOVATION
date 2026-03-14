# Análise de Cobertura de Testes Automatizados (Billing)

Esta análise avalia o estado atual dos testes automatizados (Unitários e Integração via Pytest) contra o plano de testes mestre de billing do BirthHub360 (ADR-025 e Eventos Stripe).

## 1. Cobertura Atual (O que já tem teste)
Atualmente, o projeto (via `pnpm test:agents` e a suite de orquestração) cobre razoavelmente os fluxos de sucesso simples:
- **Parse do Webhook:** Testes unitários que validam a função de assinatura criptográfica (`verify_stripe_signature`) para rejeitar payloads maliciosos ou sem segredo correto.
- **Limites Estáticos de Tenant:** Testes onde o sistema rejeita a criação de uma *Campanha SDR* se o tenant (`tier = 'free'`) já atingiu o limite de envios do dia.
- **Ferramentas de Custo (`tool_runtime.py`):** Existe validação unitária de que o consumo (cost estimation e tempo de execução) é retornado nos metadados de execução (`run_tool`).

## 2. Gaps Identificados (Onde Faltam Testes)

Os seguintes cenários financeiros cruciais **não** possuem cobertura E2E ou de integração profunda, e podem gerar bugs em produção (Revenue Leaks ou Falsos Positivos):

### A. Fluxo Completo de Metered Billing (Overage)
- **Gap:** Não há um teste de integração que simule 5 chamadas de agente, acione a fila de agregação (Batching Redis) e valide se o Orquestrador efetivamente invoca o Mock da API do Stripe (`stripe.billing.MeterEvents.create`) com a quantidade exata (5).
- **Risco:** O batching pode estar perdendo logs ou o cronjob não está processando as filas pendentes corretamente.

### B. Condição de Corrida (Race Condition) no Webhook
- **Gap:** Inexistência de testes concorrentes (`asyncio.gather`) injetando `invoice.paid` e `customer.subscription.updated` no mesmo exato milissegundo para verificar se o banco de dados impõe o Lock corretamente (sem sobrescrever a coluna de status).
- **Risco:** Upgrades acidentais simultâneos que geram cobrança dupla.

### C. Suspensão Transiente (Dunning)
- **Gap:** Faltam testes garantindo a funcionalidade de "Congelamento Seguro" (Graceful Suspend) do LangGraph. Se um webhook `past_due` chega no meio do fluxo, o teste precisa validar que o estado fica salvo como `PAUSED_DUE_TO_BILLING` ao invés de lançar uma exceção não tratada e destruir o checkpoint.
- **Risco:** Corromper os dados de execução e o cliente não conseguir retomar os fluxos pendentes após regularizar a fatura.

### D. Prorations e Downgrade
- **Gap:** Testar a lógica matemática de retenção de dados após downgrade. Se eu mockar o downgrade de Scale para Starter, o teste deve afirmar que requisições (GET) à base de relatórios mais antigas do que 3 meses retornam HTTP 403 (ou uma mensagem de paywall), e não os dados brutos.

## 3. Ações Sugeridas
1. Criar o arquivo `tests/integration/test_stripe_webhooks.py` utilizando `pytest-asyncio` com injeção de JSONs mockados representando as payloads reais do Stripe.
2. Criar fixtures em Pytest que simulem os estados temporais (`freezing time` no mock) para testar a expiração de Trial e bloqueios de Dunning no dia 7.