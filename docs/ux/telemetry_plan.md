# Plano de Telemetria de Produto - BirthHub 360

## Objetivo
Estabelecer um padrão unificado (Taxonomia) para a coleta de eventos de uso do produto no frontend e backend, permitindo análises precisas sobre o comportamento do usuário e o valor gerado pelos agentes, sem poluir o banco de dados com eventos inúteis.

## 1. Princípio da Intencionalidade
Não coletaremos `click` em todo lugar. Só disparamos eventos quando há uma intenção de negócio clara ou uma mudança de estado que afete o ROI.

## 2. Taxonomia Padrão (Event Naming Convention)
Todos os eventos devem seguir o formato estrito: `Objeto + Ação (Passado)`.
*   **Objeto:** `agent`, `tenant`, `billing`, `wizard`, `crm`, `dashboard`.
*   **Exemplos Corretos:** `agent_configured`, `wizard_completed`, `dashboard_viewed`, `email_approved`.
*   **Exemplos Incorretos:** `click_button`, `save`, `new_stuff`.

## 3. Eventos Críticos (Core Events)

### A. Fluxo de Valor (Aha Moment)
- `wizard_started`
- `crm_connected` (Propriedade: `provider_name` = salesforce/hubspot)
- `demo_data_selected`
- `agent_activated` (Propriedade: `agent_role` = sdr/closer/revops)
- `first_insight_viewed` (O "Aha Moment")

### B. Engajamento e Automação
- `agent_suggestion_approved` (Indica que o humano gostou do que a IA fez)
- `agent_suggestion_rejected` (Propriedade: `reason_code`)
- `agent_dry_run_executed`
- `notification_action_clicked`

### C. Retenção e Monetização
- `billing_plan_upgraded`
- `churn_risk_flagged_by_agent`
- `support_ticket_opened`

## 4. Propriedades Globais (Super Properties)
Todo evento enviado ao Mixpanel/Amplitude deve conter o seguinte bloco anexado automaticamente pelo SDK:
```json
{
  "tenant_id": "uuid",
  "user_role": "admin|manager|user",
  "subscription_tier": "trial|starter|enterprise",
  "agent_pack_version": "v1.2.0"
}
```

## 5. Frequência de Revisão do Schema (Tracking Plan)
- **Reunião de Governança de Dados:** Ocorrerá a cada final de ciclo de desenvolvimento (ou trimestralmente).
- **Objetivo:** O Product Manager e o Lead Data Engineer devem revisar o Data Dictionary. Eventos obsoletos ("Stale Events" sem queries associadas há 30 dias) devem ser marcados como `Deprecated` e removidos do código (culling) para reduzir a fatura da ferramenta de analytics.
