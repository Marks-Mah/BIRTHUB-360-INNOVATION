# Análise de Correlação: NPS de Agente vs Retenção - BirthHub 360

## Objetivo
Analisar a correlação estatística entre o NPS (Net Promoter Score) atribuído especificamente aos outputs de um Agente de IA e a taxa de retenção/churn do Tenant no mês subsequente.

## Hipótese Central
No BirthHub 360, o usuário não avalia a "plataforma" como um todo, ele avalia a **qualidade do trabalho do seu funcionário digital (O Agente)**.
*Hipótese:* Um NPS de Agente < 0 (mais detratores que promotores nas avaliações de outputs) é um indicador antecedente (leading indicator) mais forte de Churn no mês seguinte do que métricas tradicionais como "Frequência de Login".

## Modelo de Análise de Dados

A equipe de Dados (Data Science) executará a seguinte análise de regressão mensalmente:

1. **Amostra de Dados (Coorte):** Tenants ativos (pagantes) no Mês T.
2. **Variável Independente (X):** O NPS Agregado do Agente Principal utilizado pelo Tenant durante o Mês T.
   - *Como é medido:* Baseado nas reações explícitas do usuário aos resultados da IA (1-5 estrelas ou Polegar para cima/baixo) convertidas para a escala NPS.
3. **Variável Dependente (Y):** Status do Tenant no Mês T+1 (Retido, Expandido, Downgrade, Churn).

## Interpretação e Ações Esperadas (Actionable Insights)

*   **Correlação Forte Positiva (Confirmada a hipótese):** Se os dados provarem que Tenants com NPS de Agente negativo têm 3x mais chance de cancelar no mês seguinte:
    *   **Ação CS:** O NPS do Agente passa a compor 40% do peso do `health_score_model.md`. A queda no NPS dispara um playbook de intervenção agressiva antes da fatura fechar.
*   **Ausência de Correlação (Falso Negativo):** Se os usuários dão nota baixa para o Agente, mas continuam pagando a assinatura:
    *   **Ação Produto:** Investigar a "dor do aprisionamento". O cliente pode estar retido pelos dados históricos no CRM, mas insatisfeito. Há alto risco de ele trocar para um concorrente assim que uma feature de migração surgir no mercado.
