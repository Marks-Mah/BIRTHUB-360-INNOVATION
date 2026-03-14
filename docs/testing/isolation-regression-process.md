# Processo de Regressão de Isolamento (Isolation Regression Process)

Este documento dita **quando e como** a suíte completa de testes de isolamento multi-tenant (Isolation Suite) deve ser reexecutada. Devido ao seu peso em I/O (iniciar bancos, testar RLS, criar massas de dados para múltiplos tenants e verificar colisões), rodar a suíte de ponta a ponta consome tempo e recursos de computação no CI.

No entanto, falhar em rodar essa bateria quando uma mudança arquitetural ocorre expõe a empresa a vazamentos de dados (Cross-Tenant Leakage).

## 1. Gatilhos de Execução Automática (Obrigatórios)

A Isolation Suite *completa* DEVE ser disparada pelo sistema de CI/CD e aprovada (Exit Code 0) sob as seguintes condições antes que qualquer código possa sofrer *merge* para a branch `main` ou `production`:

1.  **Qualquer modificação no esquema de banco de dados (Migrations):**
    *   Sempre que um Pull Request incluir arquivos nas pastas `prisma/migrations`, `alembic/versions`, ou qualquer script SQL que crie, modifique ou remova tabelas, índices ou chaves estrangeiras. (Isto garante que o RLS não foi esquecido).
2.  **Modificações nas Políticas de Banco (RLS):**
    *   Qualquer mudança explícita em arquivos que definam `CREATE POLICY` ou `ALTER POLICY`.
3.  **Alteração no Middleware de Autenticação/Autorização:**
    *   Mudanças nos arquivos que lidam com JWT, extração de Token, injeção de Headers HTTP ou configuração da variável de sessão `set_config('app.tenant_id')` do PostgreSQL.
4.  **Integração de Agentes (Workers):**
    *   Mudanças no código base do Orquestrador (LangGraph, Celery) que lida com o repasse de estado e o desacoplamento de mensagens assíncronas.
5.  **Releases Semanais / Scheduled Nightly Build:**
    *   Mesmo que nenhum PR tenha as características acima, a suíte deve rodar integralmente *todas as madrugadas (Cron Diário às 03:00)* contra a branch `main` para evitar que a regressão por dependências indiretas ("Configuration Drift") passe despercebida.

## 2. A "Regra de Corta-Fogo" (Firebreak Rule) para Desenvolvedores

Em ambientes de desenvolvimento local, o desenvolvedor não precisa rodar a suíte inteira de isolamento de 10 minutos após alterar a cor de um botão no CSS ou adicionar um campo na API de resposta.
*   **Testes Seletivos (Marker):** Os testes de isolamento devem estar tagueados (ex: `@pytest.mark.isolation`).
*   **Hook Pré-Commit:** O hook de `pre-commit` local pode pular os testes de isolamento se nenhum arquivo sensível (SQL, Auth) foi tocado, priorizando velocidade de entrega (Developer Experience). Mas o CI remoto *sempre* fará o Enforcement de acordo com as regras da Seção 1.

## 3. O Fluxo de Correção de Regressão

Se o Nightly Build (Cron Diário) falhar ou um PR engatilhar a quebra da Isolation Suite:

1.  **Alerta Automático:** O canal do Slack `#eng-security` recebe uma notificação vermelha: `[CRITICAL] Isolation Suite Failed on branch 'main'`.
2.  **Code Freeze (Congelamento):** Até que o isolamento volte ao status verde, todos os deploys para produção são paralisados automaticamente pelo pipeline (Blocker).
3.  **Autópsia Imediata:** O último desenvolvedor que mesclou código na branch afetada e o Engenheiro de Segurança on-call são obrigados a parear (Pair Programming) e reverter (Rollback) o PR ou implementar a correção imediatamente (Ex: Esqueceu de aplicar RLS na tabela nova de `patient_notes`).
4.  **Liberação:** A trava (Code Freeze) só se dissolve quando o commit de correção for mesclado e o CI comprovar *Zero Falha de Isolamento*.