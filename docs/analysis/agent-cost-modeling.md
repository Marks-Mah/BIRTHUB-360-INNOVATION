# Análise de Modelagem de Custos de Agentes (Cost Modeling)

Diferente de um SaaS tradicional onde o custo principal é o banco de dados (armazenamento) e os servidores web (CPU/RAM previsível), o ecossistema BirthHub360 tem **Cost of Goods Sold (COGS)** extremamente variáveis atrelados ao uso da Inteligência Artificial. Cada vez que um agente é acionado, dinheiro é gasto em tokens de LLM e ferramentas de terceiros (Tools).

Esta análise descreve como modelar, prever e controlar os custos de um agente por mês para garantir que o Tenant permaneça lucrativo dentro de sua assinatura (ou para faturá-lo corretamente no modelo Pay-As-You-Go).

## 1. A Equação de Custo por Execução (Unit Economics)

O custo de uma única execução completa de um workflow de agente ($C_{exec}$) é a soma de três componentes:

$$ C_{exec} = C_{compute} + C_{tokens} + C_{tools} $$

### A. Custo de Computação ($C_{compute}$)
O custo do tempo que o Worker processa a tarefa, incluindo o *Compute Waste* (tempo ocioso esperando I/O, ver `tool-cost-latency.md`).
*   **Fórmula:** `(Tempo de Duração em Segundos / 3600) * Preço Hora do Node`.
*   **Impacto:** Geralmente irrisório (< $0.0001), exceto em jobs muito longos (ex: Batch Processing).

### B. Custo de Tokens LLM ($C_{tokens}$)
O maior ofensor de custos. Em agentes autônomos (ReAct / LangGraph), o LLM é chamado **várias vezes** dentro da mesma execução para decidir a próxima ação. A cada turno, todo o histórico da conversa (System Prompt + Tools Desc + Chat History) é reenviado.
*   **Fórmula:** `(Total Prompt Tokens * Preço_1k_In) + (Total Completion Tokens * Preço_1k_Out)`.
*   **A "Armadilha" do RAG:** Se a tool `search_memory` (ADR-016) injetar 5 documentos inteiros no prompt do agente para ele "ler", o custo do Token de Input explode linearmente.
*   **Previsibilidade:** Difícil, pois o LLM pode resolver o problema em 1 turno ou em 5 turnos dependendo da ambiguidade do usuário.

### C. Custo de Ferramentas Pagas ($C_{tools}$)
Ferramentas da Categoria C (Third-Party APIs), como envio de SMS, Serper (Google Search), Whisper (Text-to-Speech) ou verificações de crédito (Background Check).
*   **Fórmula:** `Sum(Custo Fixo da Chamada da Tool X * Quantidade de Chamadas)`.
*   **Previsibilidade:** Mais previsível que tokens, mas sujeito a loops de retry se mal programado.

## 2. Modelagem Mensal (Monthly Run-Rate Projection)

Para prever o custo de um Agente por mês para um Tenant específico, o módulo de faturamento (Billing) e o Painel do CFO no Agent Studio usam a seguinte projeção:

1.  **Estabelecer a Linha de Base (Baseline Cost):**
    O sistema amostra as primeiras 100 execuções do agente no mês atual para encontrar:
    *   Média de Tokens In/Out por execução.
    *   Média de Tools pagas acionadas por execução.
    *   **Exemplo:** O Agente "Triagem de Lead" custa, em média, $0.05 por execução (Tokens GPT-4o + Tool de Enriquecimento de Email).

2.  **Projetar o Volume (Volume Forecast):**
    Multiplica-se a média pelo número esperado de interações.
    *   Se o site do cliente recebe 10.000 leads/mês:
    *   **Projeção:** `10.000 * $0.05 = $500,00 COGS Projetado.`

## 3. Controles e Proteção contra Bill Shock (Estouro de Orçamento)

Como os LLMs podem entrar em loops infinitos ("Agentic Loops") chamando ferramentas sem parar até o limite máximo de iterações (`max_steps` do LangGraph), um único bug pode custar dezenas de dólares em uma hora.

**Mecanismos de Controle Financeiro (FinOps):**

1.  **Limites Rígidos de Interação (Max Steps):** O orquestrador força um Hard Stop (ex: `max_iterations = 10`). Se o agente não resolver o problema em 10 chamadas de LLM, a execução é abortada para conter o sangramento de tokens.
2.  **Spend Caps (Teto de Gastos) por Tenant:** O Admin do Tenant pode (e deve) definir um limite de orçamento mensal no Policy Engine (ex: "Travar ferramentas pagas e fazer fallback para modelo barato se o gasto passar de $1.000").
3.  **Alerta de Anomalia de Token:** O Datadog emitirá um alerta se a métrica `agent_token_consumption_rate` desviar +3 desvios padrão (Sigma) da média histórica daquele tenant em uma janela de 5 minutos, indicando um possível ataque de DoS de custo (Denial of Wallet).
