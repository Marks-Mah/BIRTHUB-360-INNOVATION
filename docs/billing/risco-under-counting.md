# Análise de Risco de Under-counting

O "Under-counting" ocorre quando a plataforma consome recursos de infraestrutura caros (como inferências em LLMs na OpenAI ou requisições intensivas a APIs externas) que geram valor direto ao cliente, mas o sistema de faturamento *não registra* esse uso na cota do cliente. Isso causa um "vazamento" de receita (Revenue Leakage).

Embora prefiramos errar para o *under-counting* (em favor do cliente) do que o *over-counting* (cobrar a mais), vazamentos sistêmicos podem arruinar a margem de contribuição (Gross Margin) do plano se ultrapassarem 5%.

## Cenários Comuns de Revenue Leakage

### 1. Crashes do Orquestrador Pós-Inferência
**Cenário:** O nó do LangGraph invoca a OpenAI. A OpenAI processa os 50k tokens com sucesso, bilheta na conta do BirthHub360 e devolve a resposta (`completion`). Uma fração de segundo depois de receber a string, o contêiner do ECS sofre OOM (Out-of-Memory) ou *Kernel Panic* antes de despachar o evento `emit_billing_usage()` pro barramento de eventos (Redis).
**Mitigação:**
- Acompanhar de forma "Out-of-Band" (fora do fluxo do código): O proxy LLM (ex: Helicone ou LangSmith) já tem os cabeçalhos de `tenant_id` que enviamos por padrão. Podemos fazer um Job assíncrono que cruza as chamadas do banco de dados (pagas) com as chamadas feitas no Proxy LLM na última hora. Se o Proxy tiver cobranças não atreladas a logs no banco, contabilizá-las tardiamente.

### 2. Ocultamento por Fallbacks (Retries Intermediários)
**Cenário:** O fluxo do Agente tenta classificar um lead, mas a API de CRM (externa) falha com 502 por três vezes, custando infraestrutura e tempo em fila. Na quarta vez, dá certo. O desenvolvedor implementou o `emit_billing_usage()` apenas na cláusula de "Success (HTTP 200)". As 3 tentativas falhas com chamadas parciais a LLMs nunca foram faturadas contra o usuário, embora a culpa seja do CRM do cliente instável.
**Mitigação:**
- Os *counters* de billing devem ser incrementados localmente (`redis.incr`) a cada sub-etapa dispendiosa individual, em vez de depender apenas do bloco de finalização geral do *Workflow*.

### 3. Falha de Envio Agregado para o Stripe (Batching Error)
**Cenário:** O nosso Worker agrupa os 1.000 usos do Tenant `A` na última hora para fazer apenas um `MeterEvent` no Stripe. A payload JSON fica ligeiramente malformada devido a um caractere estranho num metadata ou excedendo o limite de tamanho do Stripe. A requisição HTTP falha, e o Worker morre ou limpa a fila. Sumiram 1.000 unidades de faturamento de uma vez.
**Mitigação:**
- Usar tabelas transacionais (`tenant_usage_logs`) onde a coluna `stripe_meter_id` começa `NULL`.
- Somente após o Stripe retornar sucesso (`HTTP 200 OK`) no Batch, o banco relacional local é atualizado para `stripe_meter_id = 'evt_...'`. Se falhar, os dados não se perdem e serão re-enviados na próxima janela.

## Ação Contínua
A equipe de FinOps (Revenue Operations + Engenharia) deve revisar mensalmente o "Custo da Nuvem" (AWS + OpenAI) versus "Uso Overage" daquela coorte. Se as linhas divergirem em tendência (o custo sobe, mas o overage fica achatado), um *leak* crítico está ocorrendo no código.