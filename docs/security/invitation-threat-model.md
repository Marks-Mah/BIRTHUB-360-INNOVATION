# Threat Model: Convites de Organização (Organization Invitations)

Este documento modela as ameaças (Threat Modeling) focadas exclusivamente no fluxo de envio e aceite de convites para ingresso em Tenants (Organizações) no BirthHub360.

## 1. Contexto do Fluxo de Convites
1. Um Administrador (`Admin`) do `Tenant_A` envia um convite para `email_destino`.
2. O sistema gera um token alfanumérico único e o atrela à tabela `organization_invitations` com o `tenant_id` alvo e o nível de permissão (Role).
3. O sistema dispara um e-mail com um "Magic Link" contendo o token: `https://app.birthhub360.com/invite/accept?token=XYZ`.
4. O convidado clica no link, realiza o cadastro/login, e a aplicação consome o token, adicionando-o como membro (tabela `organization_members`).

## 2. Ameaças Identificadas e Mitigações

### Ameaça 1: Token Hijacking (Interceptação do Token)
**Descrição:** O e-mail contendo o Magic Link é interceptado no trânsito (provedores de e-mail inseguros) ou o link é vazado através de histórico do navegador, extensões maliciosas, ou compartilhamento indevido pelo próprio usuário (ex: encaminhar e-mail).
**Impacto (Alto):** Um invasor com posse do token pode se passar pelo convidado, aceitar o convite e ganhar acesso legítimo (como Admin, se for o caso) aos dados do `Tenant_A`.
**Mitigações:**
*   **Amarração ao E-mail (Email Binding):** O token não é suficiente. Ao clicar no link, o sistema DEVE forçar o login/cadastro. E o e-mail do usuário logado *deve* corresponder estritamente ao e-mail para o qual o convite foi gerado na tabela `organization_invitations`.
*   *(Exceção Controlada):* Se houver necessidade de "encaminhamento", um fluxo de aceitação com confirmação OTP para o e-mail original deve ser ativado.

### Ameaça 2: Replay Attacks (Reutilização do Convite)
**Descrição:** Um atacante (ou o próprio usuário) tenta usar o mesmo URL de convite múltiplas vezes após já ter sido processado. Ou um atacante demitido da empresa usa o link antigo para tentar re-entrar no Tenant.
**Impacto (Médio):** Acesso não intencional após revogação.
**Mitigações:**
*   **Consumo Único (Single-Use Token):** No ato do aceite (onde a transação `INSERT` em `members` ocorre), o token *deve* ser fisicamente deletado, ou as colunas `status='ACCEPTED'` e `consumed_at=NOW()` devem ser atualizadas dentro da *mesma transação atômica*.
*   **Idempotência Segura:** Requisições simultâneas (race conditions) tentando aceitar o mesmo convite não devem gerar múltiplos membros.

### Ameaça 3: Convite Aceito por Usuário Errado (Conta Existente Incorreta)
**Descrição:** Um usuário que possui múltiplas contas (ou usa um PC compartilhado) clica no link e o sistema aceita o convite usando a sessão ativa no navegador que pertence a uma conta com e-mail `diferente` do esperado.
**Impacto (Alto):** Um usuário ganha acesso ao Tenant usando um e-mail corporativo diferente do aprovado pelo Admin.
**Mitigações:**
*   **Verificação Rigorosa na Sessão:** O backend deve comparar `session.email == invitation.email`. Se forem diferentes, o fluxo de aceite *deve ser bloqueado*, exigindo que o usuário faça logout e login com a conta correta.

### Ameaça 4: Enumeração e Brute Force de Tokens
**Descrição:** Um atacante tenta milhares de tokens aleatórios (`GET /api/invites/XYZ`) para encontrar um válido de qualquer organização.
**Impacto (Baixo a Médio):** Possível descoberta de que o convite existe.
**Mitigações:**
*   **Entropia:** Tokens de convite NUNCA podem ser IDs sequenciais ou UUIDs previsíveis (v1). Devem usar *Cryptographically Secure Pseudo-Random Number Generators (CSPRNG)* com alta entropia (ex: 32 a 64 caracteres de string randômica ou UUID v4 seguro).
*   **Rate Limiting no Aceite:** Limitar IPs/Contas a no máximo 5 tentativas falhas de aceite por minuto. E retornar mensagens de erro neutras.