# Plano de Telemetria

## Objetivo
Padronizar a coleta de dados de uso do produto (Mixpanel/Amplitude) para entender o comportamento do usuário B2B no BirthHub 360, sem violar a privacidade, permitindo decisões orientadas a dados.

## Taxonomia de Eventos (Padrão Objeto-Ação)
Todos os eventos devem seguir o formato `Objeto Ação` no passado.

| Nome do Evento | Trigger (Quando ocorre) | Propriedades Necessárias |
| :--- | :--- | :--- |
| `Tenant Created` | Sucesso no cadastro da agência. | `plan_type`, `source`, `industry` |
| `Agent Created` | Conclusão do Wizard do Agente. | `agent_type` (Template ou Scratch), `has_knowledge_base` (Booleano) |
| `Agent Simulated` | Envio da 1ª mensagem no testador interno. | `agent_id` |
| `Integration Enabled` | Conexão bem-sucedida de CRM/WhatsApp. | `integration_name` (ex: HubSpot) |
| `Billing Upgraded` | Pagamento confirmado na Stripe. | `old_plan`, `new_plan`, `mrr_delta` |

## Propriedades Globais (User/Group Properties)
- **User (O Atendente/Gestor):** `role` (Admin, Operator), `last_login_date`.
- **Group/Tenant (A Agência):** `tenant_id`, `active_agents_count`, `current_plan`, `total_leads_generated`.

## Frequência de Revisão
O Product Manager e SRE devem auditar a taxonomia a cada **3 meses**. Eventos obsoletos (de telas antigas) devem ser desativados do SDK para economizar custos e manter o dicionário de dados limpo.
