# Cálculo de Horas Economizadas - BirthHub 360

## Objetivo
Estabelecer um cálculo honesto, auditável e transparente sobre a quantidade de horas economizadas pelos agentes do BirthHub 360, para exibição no Dashboard principal (Métrica de ROI).

## Premissas de Honestidade
- O sistema *nunca* deve multiplicar o número de chamadas de API por um "tempo arbitrário alto" para inflar o ROI.
- Cada ação do agente possui um `estimated_human_time_seconds` (Tempo Estimado Humano em segundos) catalogado e validado por especialistas de RevOps.

## Tabela de Esforço Humano Base (Baseline)

| Ação do Agente (Ferramenta) | Tempo Estimado Humano (Baseline) | Justificativa |
| :--- | :--- | :--- |
| Enriquecimento de Lead (Clearbit/Lusha) | 3 minutos (180s) | Abrir LinkedIn, procurar cargo, copiar e colar no CRM, buscar empresa. |
| Higienização de Conta (Deduplicação) | 2 minutos (120s) | Buscar no CRM, confirmar que é duplicado, fazer o merge manual. |
| Escrita de E-mail Frio Personalizado | 10 minutos (600s) | Ler histórico do lead, encontrar "gancho", escrever copy, revisar. |
| Análise de Churn de uma Conta | 15 minutos (900s) | Abrir histórico de tickets, ver health score, olhar dados de uso do produto, escrever resumo. |
| Criação de ICP Target List (100 contas) | 60 minutos (3600s) | Filtrar no Apollo/Sales Navigator, exportar, formatar CSV. (Cálculo: 36s por conta inserida na lista final). |

## O Algoritmo de Cálculo

```python
# Pseudo-código do cálculo de ROI por Tenant

total_seconds_saved = 0

for execution in tenant_agent_executions:
    if execution.status == "SUCCESS":
        base_time = get_baseline(execution.tool_id)
        # Aplicamos um fator de desconto de 15% (taxa de erro humano natural)
        # para tornar o número ainda mais realista e conservador.
        adjusted_time = base_time * 0.85
        total_seconds_saved += adjusted_time

total_hours_saved = total_seconds_saved / 3600
```

## Auditabilidade pelo Cliente
No Dashboard, o usuário pode clicar no número de "Horas Economizadas" e ver um modal de **Extrato de ROI**:
- "Neste mês, o Agente SDR escreveu 450 e-mails personalizados (Economia: 75 horas)."
- O cliente pode baixar esse log em CSV para validar com seu time.
