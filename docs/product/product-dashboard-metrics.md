# Métricas do Dashboard de Produto (Interno)

Este documento define o painel que o time de Produto/Fundadores do BirthHub 360 olhará diariamente (ex: no Metabase/Looker) para gerenciar o negócio.

| Métrica | Definição | Fórmula / Cálculo (SQL/Analytics) |
| :--- | :--- | :--- |
| **MRR (Monthly Recurring Rev.)** | Receita recorrente total ativa no momento. | `SUM(plan.price) WHERE tenant.status = 'active'` |
| **Time-to-Aha (Mediano)** | Tempo que o tenant leva do cadastro até a 1ª simulação de chat bem-sucedida. | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (aha_event_time - signup_time))` |
| **Ativação (Activation Rate)** | % de novos tenants do mês que colocaram um agente online (Web/WhatsApp). | `(Tenants com Agente Status 'Active' / Total Tenants Cadastrados no Mês) * 100` |
| **WAA (Weekly Active Agents)** | Agentes que responderam a pelo menos 1 usuário final na última semana. | `COUNT(DISTINCT agent_id) WHERE last_interaction_date >= NOW() - 7 days` |
| **Taxa de Handoff Humano** | Porcentagem de conversas onde a IA falhou em reter ou o lead exigiu humano. | `(Chats com Human Handoff / Total Chats Resolvidos) * 100` |
| **Custo por Tenant (LLM)** | Custo médio de tokens da OpenAI gasto por agência cliente. | `(SUM(tokens_input * cost_in) + SUM(tokens_out * cost_out)) / Total Tenants Ativos` |

## Atualização e Ferramentas
Este dashboard será consolidado através do Redshift/Snowflake puxando dados limpos via ETL do RDS Primário e do Stripe.
