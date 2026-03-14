# Definição de Contagem de Uso e Incremento (Usage Counting Definition)

Este documento especifica técnica e analiticamente o que constitui "Uso" (Usage) para cada métrica restritiva do plano de um Tenant no BirthHub360. Para evitar ambiguidades contratuais, faturamentos incorretos ou lentidão no banco de dados com contadores (counters) em tempo real.

O modelo de "Preço Baseado em Uso" (Usage-Based Pricing / Overage) depende de contadores precisos, resilientes e imutáveis.

## 1. Princípios de Contagem e Otimização de Performance

**Anti-Pattern (Como NÃO contar):**
*   Rodar `SELECT COUNT(*) FROM table WHERE tenant_id = XYZ` toda vez que um cliente acessar o Dashboard ou toda vez que a API for verificar se ele tem saldo no plano. Isso destrói o banco de dados conforme as tabelas crescem.
*   Atualizar uma coluna `usage_count = usage_count + 1` na tabela do Tenant em toda requisição concorrente (causa lentidão massiva por Contenção de Lock de Linha / Row Lock Contention).

**O Padrão BirthHub360 (Como contar com sucesso):**
*   **Armazenamento de Estado (Aggregations/Events):** O sistema deve gravar o evento gerador de custo em uma tabela de auditoria/billing atômica de "Inserção Apenas" (Append-Only, ex: `billing_events`).
*   **Agregação Assíncrona (Rollups/Redis):** As métricas rápidas que barram o usuário (API Rate Limit, Cotas de Workflow) ficam no Redis/Memcached.
*   **Faturamento Oficial (Source of Truth):** O contador verdadeiro e auditável do Stripe ou do nosso banco de dados relacional é atualizado via processos em lote (Batch/Cron) ou via Webhooks do Stripe Metered Billing (Usage API) enviando agregações (ex: "Tenant X consumiu 5 execuções na última hora").

## 2. Dicionário de Recursos e Eventos Geradores (O Que Conta Como "Uso")

### 2.1. Membros (Seats)
**Ação que Incrementa o Contador (UP):**
*   A API processa um `INSERT` ou `UPDATE` mudando o status de um membro para `ACTIVE` ou o envio de um convite gera um status `PENDING`. O gatilho é a inserção na tabela associativa.
**Ação que Decrementa o Contador (DOWN):**
*   O membro é desativado (Status `SUSPENDED`, `DELETED` ou Convite Expirado/Cancelado).
*   **Reconciliação Mensal:** A contagem é baseada na "Marca D'Água Alta" (High Watermark) do mês. Se um cliente comprou um assento extra dia 5, preencheu, demitiu dia 10 e não o reutilizou até dia 30, a fatura cobra 1 assento (e não 2 assentos se ele só trocou de pessoa no mesmo assento virtual). O controle de Seat baseia-se no limite numérico simultâneo, não na pessoa física.

### 2.2. Execução de Agentes e Workflows (Invocations)
**Ação que Incrementa o Contador (UP):**
*   Quando o Orquestrador inicia a máquina de estado (LangGraph) para um Workflow ou Agente, o "Node Inicial" ou a inserção de `status=RUNNING` na tabela de histórico emite um evento de faturamento `agent.execution.started`.
*   **Retentativas e Falhas (O que não conta):** Se a invocação falhar internamente por um `HTTP 500` do próprio BirthHub360 (Bugs nossos ou da infra AWS), a execução **NÃO** conta contra a cota do cliente. No entanto, se o Agente falhar porque o próprio cliente enviou uma requisição inválida (Erro HTTP 4xx, Timeout em API do cliente, Prompt mal formado), a execução **CONTA**. O custo de computação (LLM Token, AWS Lambda) existiu e foi gerado pelo cliente.
**Ação que Decrementa o Contador (DOWN):**
*   Execuções são zedadas mensalmente no primeiro dia do ciclo de faturamento (Billing Cycle Reset). Elas não decrementam ou acumulam para o mês seguinte (Rollover), salvo pacotes Enterprise customizados.

### 2.3. Armazenamento S3 (Storage Bytes)
**Ação que Incrementa o Contador (UP):**
*   Todo evento bem-sucedido de upload na API (`POST /api/files`) gera uma assinatura para S3. O tamanho exato do arquivo (bytes inseridos no S3) é adicionado ao contador acumulado do tenant. (As metadados/banco de dados PostgreSQL não contam na quota de S3, mas devem ser limitados indiretamente pelos limites de uso gerais).
**Ação que Decrementa o Contador (DOWN):**
*   A deleção explícita de um arquivo pelo cliente ou o expurgo (Purge Policy) de registros e anexos expirados ou excluídos devem reduzir o contador de bytes totais. O faturamento de Storage é calculado pela média diária do mês (Prorated Monthly Storage).
*   Se o cliente fizer upload de 50GB no dia 1 e apagar os 50GB no dia 2, o faturamento não cobrará os 50GB cheios do mês (cobrará ~1.6GB médios proporcionais), mas o limitador bloqueará caso a soma total real passe dos 50GB no momento do upload.

### 2.4. Tokens de LLM (Para Planos "Pay-as-you-go" e BYOK)
*   **Traga sua Própria Chave (BYOK):** Se o cliente configurar a sua própria chave da OpenAI (`Bring Your Own Key`) no painel do BirthHub360, os tokens consumidos são enviados para a API dele. O nosso contador de Tokens é apenas informativo (Métrica de Sucesso) e nunca entra no faturamento do SaaS ou limita a cota.
*   **LLM Nativo (Nossa Infra):** Quando o Agente consome modelos LLM usando a conta corporativa do BirthHub360, o retorno da API da OpenAI (`usage.total_tokens`) é gravado em um log auditável assíncrono por execução (ex: Node Worker do LangGraph ao finalizar a task de inteligência) e enviado como evento agregado ao Stripe Metered Billing no fim do dia, cobrando a fração de cêntimos do cliente. O atraso de contagem (Delay) é aceitável, mas o "Hard Stop" orçamentário deve ocorrer via Redis com alertas no Dashboard se o limite financeiro mensal for atingido (Spend Limit).