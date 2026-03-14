# Modelo de Health Score

## Definição
Um modelo quantitativo (0 a 100) para prever a probabilidade de um Tenant (Agência B2B) cancelar a assinatura (Churn) ou dar um upgrade, permitindo ações proativas do time de Customer Success (CS).

## Variáveis e Pesos

| Variável (O que medimos) | Peso no Score | Descrição |
| :--- | :--- | :--- |
| **Utilização de Tokens (Adoção de IA)** | 40% | Consumo mensal de tokens/horas economizadas em relação à média do plano. Alta adoção = alto valor percebido. |
| **Login Frequency (Engajamento)** | 20% | Quantas vezes o Gestor (Admin) logou no painel nos últimos 14 dias para ver relatórios. |
| **Ativação de Integrações (Stickiness)** | 25% | Se o agente está conectado ao CRM ou WhatsApp, o BirthHub vira "infraestrutura" da agência e é mais difícil de cancelar. |
| **NPS do Agente / Feedback** | 15% | Se a avaliação das conversas pela ponta final (leads) é positiva ou se o Gestor abriu muitos tickets de "IA burra". |

## Faixas de Risco e Alertas

- **🟢 Saudável (Score 80-100):** Cliente retido. Probabilidade alta de Upsell.
  - *Alerta:* Notificar time de Vendas se o consumo chegar a 90% do limite (oportunidade de upgrade).
- **🟡 Risco Médio (Score 50-79):** Engajamento estável, mas sem uso de features premium.
- **🔴 Risco Alto / Churn Iminente (Score 0-49):**
  - *Trigger:* Score cai abaixo de 50.
  - *Alerta P0:* Ticket automático aberto no Zendesk/HubSpot para o CS Manager intervir em menos de 24 horas.
