# Critérios de Aceite de Segurança Obrigatórios em PRs

Mudanças em bibliotecas de autenticação (NextAuth, Supabase Auth), controle de acesso (Middlewares de RBAC, RLS do banco de dados) e integração financeira em Pull Requests devem seguir um rigor excepcional. Esses são os critérios mandatórios de aceite:

## 1. Verificação de Acesso e Escopo (Tenant Isolation)

Qualquer nova rota da API desenvolvida (FastAPI/Express) **DEVE**:

- [ ] Estar blindada por middleware de verificação de token válido, exceto se documentado explicitamente como Webhook público (onde deve checar assinatura HMAC).
- [ ] Recuperar a entidade pelo Banco de Dados injetando `tenant_id` na cláusula `WHERE`. Exemplo inaceitável: `SELECT * FROM Invoices WHERE id = request.id`. Exemplo correto: `SELECT * FROM Invoices WHERE id = request.id AND tenant_id = context.tenant_id`.

## 2. Tratamento Seguro de Inputs (Sanitization)

Qualquer endpoint ou função que sirva dados do cliente para a IA ou para um Dashboard **DEVE**:

- [ ] Possuir Zod/Pydantic schema estrito rejeitando parâmetros não solicitados.
- [ ] Escapar strings enviadas pelo usuário que passem ao longo dos prompts (prevenção de Injection).

## 3. Gestão de Erros Não Verbosais

- [ ] Certificar-se que try/catch blocks e Fallbacks não retornam Strings complexas como _Stack Traces_ nos JSONs das requisições HTTP públicas do `api-gateway`, prevenindo Information Disclosure. Erros devem sempre ser genéricos no cliente ("Erro interno ao processar"), e granulares apenas nos Logs.

## 4. Validação de Sessão

- [ ] Confirmação que Logouts encerram de fato a sessão ou invalidam os tokens (Blacklist/Short TTL).
- [ ] Mudanças de papéis (Role) e privilégios re-avaliam tokens existentes, ou exigem login novamente.

Se um Revisor identificar que uma dessas checagens não está coberta na PR com o novo código, ele é **obrigado a rejeitar com "Request Changes"**.
