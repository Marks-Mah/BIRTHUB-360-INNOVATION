# North Star Metrics do Produto - BirthHub 360

## Objetivo
Definir a "Métrica Estrela-Guia" (North Star Metric - NSM) e suas métricas secundárias correspondentes (Input Metrics) para garantir que todos os times (Produto, Engenharia, Vendas) estejam alinhados com o mesmo conceito de "Valor Entregue".

## 1. A North Star Metric (NSM)

A métrica única que melhor captura a essência do valor do BirthHub 360 para os clientes é:

**NSM:** `Horas Automatizadas Úteis por Semana por Tenant` (Weekly Useful Automated Hours per Tenant - WUAHT).

**Por que não Receita (ARR)?** Receita é uma métrica de atraso (Lagging indicator). Se o produto for ruim hoje, a receita só cai daqui a 6 meses.
**Por que não "E-mails enviados"?** Isso é uma Vanity Metric.
**Por que "Horas Automatizadas Úteis"?** Essa métrica só cresce se o agente trabalhar (Automação) E se o usuário aprovar o trabalho ou ele resultar em sucesso no CRM (Útil). É o balanço perfeito entre quantidade e qualidade.

## 2. Input Metrics (Métricas de Engrenagem)
Para que a NSM suba, os times devem focar nessas métricas que podemos influenciar diretamente:

### Input 1: Ampliação de Casos de Uso (Breadth)
- **Métrica:** `Número Médio de Agentes Ativos por Tenant`.
- **Dono:** Time de Produto / Growth.
- **Hipótese:** Se um cliente usa apenas o Agente SDR, sua economia é limitada. Se o levarmos a instalar o Agente de Sales Ops, as Horas Automatizadas dobram.

### Input 2: Confiança na IA (Trust & Depth)
- **Métrica:** `% de Execuções de Agente em 'Auto-Pilot' vs 'Draft/Approval'`.
- **Dono:** Engenharia / IA Core.
- **Hipótese:** Clientes começam pedindo aprovação manual (Draft). Se os LLMs forem precisos (baixa alucinação), eles ligam o Auto-Pilot. Isso diminui o tempo gasto pelo humano, aumentando drasticamente a NSM.

### Input 3: Tempo para Primeiro Valor (TTFV)
- **Métrica:** `% de Novos Tenants que alcançam > 1 Hora Automatizada nas primeiras 48h`.
- **Dono:** Time de Onboarding / UX (JULES).
- **Hipótese:** Se reduzirmos a fricção no Onboarding (conforme definido no Ciclo 9.1 e 9.2), mais contas sobrevivem ao Trial e ativam a máquina de gerar ROI.
