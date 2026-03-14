# SLA (Service Level Agreement) de Disponibilidade de Dados de Billing

Para que clientes corporativos (Enterprise/Scale) confiem no modelo de cobrança variável (*Overage*), eles precisam de visibilidade tempestiva sobre o quanto estão consumindo ao longo do mês, para poderem prever o orçamento do próximo fechamento de ciclo e evitar o "Bill Shock" (susto na fatura).

## 1. Latência do Dashboard de Uso (In-Month SLA)

O BirthHub360 se compromete com a seguinte promessa de disponibilidade dos dados de consumo na tela "Meu Uso" (*Billing Settings*):

- **Tempo Real Estimado (P95):** 95% das interações com agentes de IA e execuções de fluxo aparecerão no gráfico de consumo do usuário em até **1 hora** após a execução (agrupamento via cronjob).
- **Hard SLA:** Todos os dados de consumo de um dia corrente (D0) estarão obrigatoriamente consolidados e visíveis no dashboard do cliente até as **12:00 PM UTC do dia seguinte (D+1)**.
- Essa janela permite que os nossos Workers leiam as DLQs noturnas e façam os *retries* de contagem, caso o Redis tenha sofrido gargalos no pico do expediente.

## 2. Fechamento de Fatura (End-of-Cycle SLA)

Quando o ciclo do plano mensal de um cliente termina (ex: Dia 30 do mês corrente, às 23:59), é necessário que todo o consumo excedente daquele mês esteja perfeitamente contabilizado no Stripe para ser cobrado no dia 1º do mês subsequente.

- O sistema interrompe o envio de métricas "atrasadas" do mês anterior no momento de transição de ciclo no Stripe.
- **D+3:** O cliente tem acesso ao Extrato Detalhado do uso do Mês X (Relatório PDF com as interações de IA listadas por Agente) o mais tardar no **terceiro dia do mês subsequente (D+3)**, disponibilizado via Storage Seguro (ex: AWS S3 com link assinado no painel).

## 3. Consequências de Violação de SLA

Se a latência de envio de medição (*metering*) para o provedor de pagamento exceder a tolerância e causarmos faturamento retroativo abusivo:
- **Descarte de Overage:** Qualquer "uso real" que ocorra em um mês X, mas que devido a uma falha de infraestrutura nossa não for computado no banco e no Stripe antes do fechamento da fatura desse mês, **não será repassado para o mês seguinte (X+1)**. O sistema assume o prejuízo (Write-off) a fim de preservar a confiança do cliente. Não realizamos cobranças retroativas surpresa relativas a meses anteriores.