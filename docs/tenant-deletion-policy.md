# Política de Retenção e Deleção de Tenant

No cenário B2B do BirthHub 360, um Tenant (Cliente da Plataforma) que encerra seu contrato ou solicita ativamente a exclusão de sua conta via LGPD entra em um fluxo rígido de Deleção. Devido à existência de dados contábeis (Faturamento) atrelados à arquitetura base, o comando de "Deletar Conta" na UI não executa um simples `DELETE FROM tenants`.

## O Processo de Encerramento (Offboarding)

### Fase 1: Soft-Delete (Dia 0)

- Quando o Tenant clica em "Excluir Conta", o sistema aplica uma marcação `deleted_at = NOW()` e `status = 'INACTIVE'` na tabela principal.
- **Efeitos imediatos:**
  - Todos os tokens de sessão (JWT) ativos são invalidados.
  - O Gateway de API passa a rejeitar chamadas desse Tenant (`403 Forbidden`).
  - Agentes de IA são imediatamente abortados/cancelados (Jobs removidos da fila BullMQ) para cessar qualquer interação com leads no mercado e queima de tokens de LLM.
- **Risco e Arrependimento:** Os dados PII e pipelines permanecem no banco por um período de Graça/Retenção de **30 Dias** antes do expurgo permanente, permitindo o restauro caso haja ação fraudulenta na interface ou desistência do churn.

### Fase 2: Purge Definitivo e Anonimização (Dia 31)

Ao cruzar a janela de carência, um CRON Job noturno executa as seguintes rotinas destrutivas (Hard Delete):

1. **Identificadores Pessoais e Leads:** O banco apaga em cascata (`ON DELETE CASCADE`) todos os registros da tabela `leads`, e-mails de comunicação do SDR, histórico de conversas (Memória LLM do LangGraph) associados a esse `tenant_id`. Nenhuma cópia permanece.
2. **Dados de Integração:** O Agent Orchestrator faz chamadas "limpa-trilho" no Stripe (revogando Auth/Webhooks) e invalidando chaves OAuth ativas do cliente.
3. **O Que Sobrevive (Anonimização Obrigatória):** Faturas financeiras transacionadas na plataforma antes da deleção e logs de auditoria críticos (_AgentLog_) permanecem em virtude da legislação tributária, **porém**, os nomes associados à tabela mestre são sobreescritos (ex: `tenant_name` vira `"Tenant Deletado #A8X"`).

## Auditoria

Toda chamada para o endpoint de deleção, bem como o disparo do Worker de expurgo, deixa um rastro inalterável na tabela de Auditoria separada (Logs), indicando qual usuário solicitou a deleção, o IP e o instante, comprovando perante órgãos regulatórios que a LGPD/GDPR "Right to be Forgotten" foi cumprida.
