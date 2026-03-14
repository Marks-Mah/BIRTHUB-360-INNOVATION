# Critérios de Aceite: Zero Falha de Isolamento (Zero Leakage Tolerance)

No escopo de um sistema B2B e Multi-Tenant como o BirthHub360 (que gerencia dados de saúde, CRM e faturamento corporativo), o vazamento de dados de um cliente para a tela de outro é um **Evento Extintivo (Extinction-Level Event)** para o SaaS. Pesa em multas da LGPD, perda absoluta de reputação e quebra de contrato (Breach of Contract).

Portanto, o Pipeline de Continuous Integration (CI) possui tolerância zero para falhas na Suíte de Isolamento (Isolation Suite).

## A Regra de Ouro (The Zero Tolerance Rule)
*   **Qualquer** PR (Pull Request) onde um único teste da pasta `tests/isolation/` falhe, será permanentemente barrado de ser mesclado (Merge Blocked) na branch `main` ou `production`.
*   Diferente de testes de interface (Flaky UI tests) ou retentativas de IA que podem falhar por timeout de rede e serem "ignorados", uma falha de isolamento **nunca é ignorada**. A pipeline é Hard Stop (Exit Code 1).

## Critérios de Validação da Suíte

Para que um deploy em produção seja considerado seguro ("Isolation Passed"), os seguintes critérios devem ser verdadeiros, sempre:

1.  **Imunidade a Interseção (No Cross-Talk):**
    *   Dados criados no setup de teste do Tenant A (ex: `Patient(id=123, name="John")`) nunca aparecem no payload JSON retornado por um endpoint sendo consumido com o Bearer Token do Tenant B.

2.  **Imunidade a Acesso Direto (IDOR Protection):**
    *   Toda tentativa de forçar um CRUD via ID direto que não pertença à organização logada retorna estritamente **HTTP 404 (Not Found)**. O retorno de HTTP 403, 500, ou o vazamento de metadados como "O paciente já existe" constitui falha da suíte.

3.  **Contenção Transacional (Database Sandbox):**
    *   Ao final do teste unitário/integração, o Tear Down (Rollback) limpa os dados. Se dois testes rodam em paralelo (Workers), o `app.current_tenant_id` da Thread 1 nunca contamina a Thread 2 (Thread Safety). A ausência de falhas randômicas no CI prova o isolamento do pooler.

4.  **Inibição de Injeção Global (No God Mode):**
    *   As tentativas simuladas de injetar `tenant_id=null`, valores vazios `''` ou `tenant_id='*'` falham na validação (Bad Request) e não retornam um Bypass (onde a API acidentalmente retorna tudo do banco).

## Passos no Caso de Falha no CI

Se a suíte quebrar durante o desenvolvimento de uma feature (O GitHub Actions ficar vermelho em `test_isolation`):
1.  **Pare o Desenvolvimento:** O desenvolvedor não deve criar "Workarounds" no teste para fazê-lo passar (ex: comentando `@pytest.mark.isolation`).
2.  **Investigue o RLS ou Middlewares:** A falha significa que você criou uma tabela sem a policy, esqueceu de passar o contexto de tenant pro ORM, ou criou um JOIN vulnerável.
3.  **Corrija e Verifique:** Aplique a correção na camada de segurança e re-rode a prova até o verde. O revisor de código deve atestar a correção e checar se o RLS não foi removido.