# Capabilities e Safety Rails (Manifesto de Agentes)

No ecossistema BirthHub360, as *capabilities* (capacidades) de um agente definem rigorosamente quais tipos de ações e interações ele está autorizado a realizar dentro do ambiente multi-tenant. Estas capacidades atuam como permissões de alto nível no Policy Engine.

## Definição de Capabilities

1. **`read`**: Permite ao agente apenas ler dados.
   - **Exemplo**: Consultar o CRM, ler registros de pacientes, consultar faturas do Stripe.
   - **Safety Rails**: Proibido alterar o estado da aplicação. Timeouts curtos são aplicados. Em caso de *Rate Limit* externo, a operação falha sem efeitos colaterais. O *Data Redaction* de PII é forçado no log de saída.
2. **`write`**: Permite ao agente criar, alterar ou deletar dados.
   - **Exemplo**: Atualizar o status de um lead no CRM, criar um novo registro no banco.
   - **Safety Rails**: Todas as ações `write` devem ser acompanhadas de um ID de idempotência para evitar duplicação. Requer trilha de auditoria (Audit Log) estrita apontando o *tenant_id* e o JWT do acionador. Falhas em ações `write` devem usar Circuit Breakers para não corromper o estado parcial do banco.
3. **`execute`**: Permite iniciar fluxos de trabalho secundários, acionar outros agentes ou realizar computação intensiva de terceiros.
   - **Exemplo**: Disparar um sub-agente LangGraph, chamar uma função *Serverless* externa.
   - **Safety Rails**: Custo de execução (budget overflow) deve ser monitorado rigidamente. Sujeito a limites de complexidade do plano de faturamento do tenant. Requer aprovação (HITL - Human in the Loop) para execções que não estejam em *allow-list*.
4. **`notify`**: Permite ao agente enviar comunicações assíncronas para fora do sistema ou para usuários.
   - **Exemplo**: Enviar um email via Resend, postar em um canal do Slack, disparar um Webhook.
   - **Safety Rails**: Implementa limites de *Rate Limiting* estritos por tenant para evitar spam. O conteúdo deve ser sanitizado para prevenir vazamento de PII. Nenhuma notificação de aprovação crítica pode conter *One-Click Links* que realizem mutações no sistema sem autenticação.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.1.J2-a1b2c3d4]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.1.J2-VALIDATED-e5f6g7h8]`
