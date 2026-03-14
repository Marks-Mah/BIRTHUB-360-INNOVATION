# KPIs Financeiros B2B SaaS

O painel de saúde financeira (FinOps) do BirthHub360 é regido por estas métricas fundamentais. Como nosso modelo é híbrido (Base + Overage), a padronização das fórmulas é essencial para evitar distorções nas reuniões de diretoria.

## 1. MRR (Monthly Recurring Revenue)
A receita mensal previsível. **Atenção:** O faturamento de uso variável (*overage*) NÃO entra no MRR, pois não é garantido para o mês seguinte.
- **Fórmula:** `Soma de todas as assinaturas ativas mensais + (Assinaturas anuais ativas / 12) + Seats adicionais ativos`
- **Fonte da Verdade:** API do Stripe (`stripe.subscriptions`) somando os itens base mensais.
- **Derivados:**
  - *New MRR:* Novos clientes do mês.
  - *Expansion MRR:* Upgrades da base atual.
  - *Contraction MRR:* Downgrades da base atual.

## 2. ARR (Annual Recurring Revenue)
A versão anualizada do MRR. Usada para *valuation* da startup.
- **Fórmula:** `MRR * 12`
- **Fonte da Verdade:** Relatório gerado a partir do Stripe Billing.

## 3. Churn Rate (Taxa de Cancelamento)
A velocidade com que perdemos clientes ou receita.
- **Logo Churn (Contagem):** `(Clientes Cancelados no Mês / Total de Clientes Ativos no início do Mês) * 100`
- **Revenue Churn (Financeiro):** `(MRR Perdido no Mês / MRR Total no início do Mês) * 100`
- **Net Revenue Retention (NRR):** Métrica de Ouro. `(MRR Inicial + Expansion MRR - Contraction MRR - Churn MRR) / MRR Inicial`. Se o NRR > 100%, o BirthHub360 cresce mesmo sem adquirir novos clientes (graças ao upsell/overage de clientes fiéis).

## 4. CAC (Customer Acquisition Cost)
Quanto gastamos (Marketing + Vendas + Infra de IA em Trial) para trazer um novo cliente pagante.
- **Fórmula:** `(Gasto Total em Vendas + Marketing do Mês + Custo Servidor de Contas Trial Mês) / Novos Clientes Adquiridos no Mês`
- **Fonte da Verdade:** O ERP (ex: Xero/ContaAzul) para despesas da folha de pagamento de marketing + Fatura AWS/OpenAI, cruzado com os novos `stripe_customer_ids` gerados no banco.

## 5. LTV (Customer Lifetime Value)
Quanto dinheiro um cliente deixa no BirthHub360 ao longo de toda sua vida conosco.
- **Fórmula (Simplificada para SaaS):** `ARPA (Receita Média por Conta) / Churn Rate`
- **Ajuste de Margem (Avançado):** Para maior precisão no nosso modelo de IA, usamos `(ARPA * Gross Margin %) / Churn Rate`, onde *Gross Margin* deduz o custo das interações da OpenAI.
- **Métrica Alvo:** A relação **LTV:CAC** do BirthHub360 deve ser superior a `3:1` (A receita vitalícia deve ser no mínimo três vezes maior que o custo para adquirir o cliente).

## 6. ARPU (Average Revenue Per User/Account)
Receita Média por Conta. No nosso caso, como o Overage altera a fatura fortemente, separamos o ARPU em dois:
- **Core ARPU:** `MRR / Clientes Ativos`.
- **Total ARPU (Blended):** `(MRR + Faturamento de Overage do Mês) / Clientes Ativos`.