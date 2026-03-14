# Política de Expiração de Convites (Invitation Expiration Policy)

Este documento dita as regras sobre o ciclo de vida (Life-cycle) dos convites para membros ingressarem em organizações (Tenants) do BirthHub360. A permanência indefinida de links de convite (Pending Invites) representa um risco de segurança.

## 1. Prazos Padrão de Expiração (Default TTL)
Todos os convites emitidos para ingresso em um Tenant têm um **Tempo de Vida (Time-To-Live - TTL)** finito e inegociável, independentemente do plano do cliente.

*   **Prazo Máximo de Expiração (Padrão e Legal):** 7 dias (168 horas) a partir da data de criação (`created_at`).
*   **Justificativa de Segurança:** Após 7 dias, a chance de o e-mail de convite original cair em mãos erradas ou se tornar inativo/comprometido aumenta substancialmente. Reduzir a janela diminui a superfície de ataque de *Token Hijacking*.

### O que acontece após expirar?
Quando o usuário tenta acessar o "Magic Link" de um convite expirado (onde `created_at + 7 dias < NOW()`):
1.  **Acesso Bloqueado:** A API retorna HTTP 400 (Bad Request - Link Expirado) em vez de iniciar o fluxo de aceite ou criação de conta vinculada.
2.  **Mensagem Segura UI:** "Este convite expirou ou já foi utilizado. Solicite um novo ao administrador da organização." (Nunca diga se o usuário do convite existe ou foi aceito por outrem na mensagem de erro).
3.  **Remoção Assíncrona (Cron/Worker):** Diariamente, um job em background apaga *fisicamente (Hard Delete)* todos os registros da tabela `organization_invitations` que estão expirados há mais de 24 horas, mantendo a tabela enxuta.

## 2. Ações Relacionadas a Mudanças no Tenant Alvo

A validade do convite é estritamente dependente do estado da organização que enviou o convite. Se o estado do Tenant (Organização pendente) for alterado, ações automáticas sobre os convites devem ocorrer.

### 2.1. Tenant Deletado (Soft Delete ou Purge)
*   **Ação Obrigatória:** Se o `Tenant_A` for deletado (via cancelamento de plano, punição comercial ou inatividade), **todos os convites PENDENTES atrelados a ele devem ser imediatamente e automaticamente revogados/invalidados**.
*   **Implementação:** A exclusão (lógica ou física) do tenant dispara a exclusão em cascata (`ON DELETE CASCADE`) na tabela de convites. O usuário que tentar aceitar receberá "Convite Inválido/Expirado". Ninguém pode ser admitido em uma organização morta.

### 2.2. O Emissor Original (Admin) Foi Removido ou Rebaixado
*   **Regra de Ouro:** O convite **PERMANECE VÁLIDO** por seus 7 dias de vida. A aceitação do membro na organização não depende mais da pessoa física do administrador que apertou o botão "Enviar". A organização emite o convite. Portanto, a saída do administrador (ex: demissão do gerente) não afeta os convites em trânsito.
*   *Nota Executiva:* Se a empresa desejar revogar ativamente, ela deve usar o painel da UI na seção de convites e clicar em "Cancelar/Revogar Convite", que apagará o token do banco.