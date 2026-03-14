# Modelo de Health Score - BirthHub 360

## Objetivo
Definir o modelo matemático e os gatilhos comportamentais que determinam a "Saúde" (Health Score) de um tenant na plataforma, permitindo que a equipe de Customer Success aja de forma preditiva contra o churn e a favor de expansões (Upsell).

## 1. Variáveis e Pesos do Modelo (Escala 0 a 100)

O algoritmo processa os dados diários do tenant e calcula um score baseado em 4 dimensões principais:

| Dimensão | Peso | Variáveis (Sinais Positivos + / Negativos -) |
| :--- | :---: | :--- |
| **Uso de Agentes (Adoção)** | 40% | (+) `horas_economizadas` nas últimas 3 semanas.<br>(-) Queda de >30% no volume de execuções na última semana. |
| **Profundidade (Stickiness)** | 30% | (+) Proporção de execuções em modo "Auto-Pilot" vs "Draft".<br>(+) Mais de 1 usuário ativo no tenant (Adoção da equipe). |
| **Engajamento com IA** | 20% | (+) Taxa de aprovação de recomendações (Thumbs Up).<br>(-) Rejeição sistemática das saídas do agente. |
| **Eventos de Risco (Billing)** | 10% | (-) Pagamento da mensalidade atrasado > 3 dias (Dunning).<br>(-) Atingiu 100% do limite do plano e não fez upgrade. |

## 2. Faixas de Risco (Risk Bands)

A pontuação final categoriza o cliente em três estados de alerta no painel de CS (Customer Success):

- **Verde (Healthy) [80 - 100]:**
  - Conta voando em cruzeiro. Usando IA consistentemente.
  - *Ação Esperada:* Não interromper o fluxo. Sinalizar para Account Executives como oportunidade de Upsell.
- **Amarelo (At Risk) [50 - 79]:**
  - Adoção estagnada. O cliente configurou o agente, mas só aprova manualmente ou o volume despencou.
  - *Ação Esperada:* Disparo automatizado de e-mail de dicas ("Vimos que você está aprovando e-mails manualmente. Veja como ligar o Auto-pilot de forma segura").
- **Vermelho (Critical - Churn Imminent) [0 - 49]:**
  - Queda abrupta de uso. Falhas de login. Falhas de cobrança. Nenhum insight da IA adotado.
  - *Ação Esperada:* Alerta imediato no canal do Slack do CSM. Aciona o SLA de intervenção humana.

## 3. Threshold de Alerta Proativo (The "Drop" Trigger)
Mais importante que o número absoluto é a **velocidade de queda**. Se uma conta Verde (90 pontos) cai para 65 pontos (Amarelo) em menos de 7 dias, um alerta "Fast Drop" é gerado, exigindo análise humana, pois indica uma quebra de integração (ex: Token do CRM expirado e ignorado) ou mudança brusca na equipe do cliente.
