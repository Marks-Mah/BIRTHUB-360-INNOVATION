# Revisão do Modelo de Health Score e Correlação com Churn

## Revisão Metodológica
O "Health Score Model" proposto (Peso de 40% em Uso de IA, 25% em Stickiness/Integrações, 20% em Login, 15% em Feedback) foi revisado contra benchmarks de mercado de SaaS B2B (ex: Totango, Gainsight).

## Confirmação de Hipóteses
- **Correlaciona com Churn?** Sim. Em SaaS B2B "set and forget" (como widgets de chat), o *Login Frequency* pode cair e o cliente ainda reter a assinatura se o *Uso de IA (Tokens)* estiver alto. O modelo pondera corretamente que o "Trabalho Invisível" (IA processando em background) é mais importante que o tempo de tela do gestor.
- **Thresholds:** A linha de corte (Score < 50 para Risco Crítico) garante que o time de Customer Success tenha pelo menos 14 a 30 dias de vantagem (Runway) para atuar antes da renovação da fatura mensal.

**Status:** Aprovado para ser o cálculo nativo no motor de Analytics do CS.
