# Análise de Correlação: NPS do Agente vs Retenção (Churn)

## A Hipótese
Se o Agente de IA que o nosso cliente B2B configurou recebe feedbacks péssimos (NPS Baixo) dos usuários finais (leads/B2C), o cliente B2B sentirá que a ferramenta "não funciona" e cancelará a assinatura no mês seguinte.

## Dados da Correlação (Sintético / Projeção)
- **Tenants cujo Agente tem NPS > 4.0:** Churn rate projetado de **2% ao mês**.
- **Tenants cujo Agente tem NPS < 2.5:** Churn rate projetado de **15% ao mês**.

## Insight de Produto
O "NPS do Agente" não é apenas uma métrica de qualidade técnica; é um **Leading Indicator fortíssimo de Churn Financeiro**.

## Plano de Ação
1. Integrar a variável "Average Agent NPS" com peso de 15% no cálculo do "Health Score Model" (conforme definido em `docs/cs/health-score-model.md`).
2. Disparar Playbooks de CS focados em "Quality Assurance" sempre que a nota do agente cair abruptamente. O Suporte não deve apenas resolver bugs de login, mas atuar como "Consultores de IA" para ajudar o cliente a melhorar a performance do robô.
