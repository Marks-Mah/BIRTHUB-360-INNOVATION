# Orçamentos Padrão por Plano de Assinatura

O modelo de negócios do BirthHub360 é baseado em um modelo híbrido ("Tiered Flat Rate" + "Usage-based Overage"). Este documento define os limites padrão embutidos nos planos (Soft e Hard Limits) e a justificativa de negócios para proteger as margens operacionais da empresa.

## Planos e Orçamentos Embutidos (Included Credits)

### 1. Plano FREE (Trial 14 Dias)
*   **Orçamento de LLM Tokens:** $5.00 / Mês
*   **Orçamento de DaaS (APIs Pagas):** $0.00 / Mês (Bloqueado)
*   **Conectores Disponíveis:** Apenas conectores gratuitos ou baseados no BYOK (Bring Your Own Key), onde o cliente insere sua própria chave da OpenAI ou Salesforce.
*   **Justificativa:** Impedir prejuízo real (cash burn) com testes automatizados abusivos ou contas falsas durante a aquisição de PLG. Permite que o cliente sinta o valor usando dados mockados ou BYOK.

### 2. Plano PRO (Seat-Based, focado em PMEs)
*   **Orçamento de LLM Tokens:** $50.00 por assento / Mês (Soft Limit $40.00)
*   **Orçamento de DaaS:** $20.00 por assento / Mês (Hard Block ao atingir)
*   **Justificativa:** Baseado na "Execução Típica" (p50), um vendedor (SDR) precisa de cerca de 1.000 qualificações mensais. Ao custo médio de $0.05 por qualificação (LLM + leve enriquecimento), o custo real fica em \~$50, garantindo uma margem bruta (Gross Margin) > 70% sobre a licença (ex: vendida a $199/mês).

### 3. Plano ENTERPRISE (Volume + Customização)
*   **Orçamento de LLM Tokens:** Personalizado via contrato anual. Overage ativado.
*   **Orçamento de DaaS:** $100.00 base / Mês, com faturamento automático excedente (Overage Billing via Stripe Metered Usage).
*   **Justificativa:** Clientes Enterprise tendem a ter automações não tripuladas ("headless agents") que rodam em background aos milhares. O Hard Block interromperia operações críticas. Substitui-se o limite de uso por um limite de crédito comercial, transferindo o custo diretamente para a fatura do cliente na virada do mês.

## Regra de Transferência (Rollover)
Créditos embutidos nos planos **não acumulam** para o mês seguinte. A política "Use it or lose it" facilita a previsibilidade financeira e os acordos de volume (Commitment) com fornecedores como OpenAI e Anthropic.
