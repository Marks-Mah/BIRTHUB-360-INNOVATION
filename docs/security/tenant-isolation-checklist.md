# Checklist de Revisão de Tenant Isolation em PRs

Esta é a checklist padrão que deve ser aplicada e verificada durante o Code Review de todo Pull Request (PR) no repositório do BirthHub360 que adicione, altere ou remova funcionalidades que lidam com dados de tenants.

## 1. Banco de Dados (DB & Models)
- [ ] **Novas Tabelas com `tenant_id`:** Se uma nova tabela foi criada que armazena dados de clientes, ela possui a coluna `tenant_id`?
- [ ] **Políticas RLS Aplicadas:** Foi criada e habilitada uma política RLS (Row-Level Security) na nova tabela garantindo que as queries só acessem os dados do tenant correspondente?
- [ ] **Foreign Keys e Constraints:** As chaves estrangeiras relacionadas ao tenant estão configuradas com `ON DELETE CASCADE` ou estratégia apropriada, de acordo com as políticas da empresa?
- [ ] **Migrations Reversíveis:** A migration correspondente inclui um `down` method que desfaz a política RLS e exclui a tabela corretamente?
- [ ] **Bypass Não Intencional de RLS:** Foi garantido que as consultas não são executadas em contexto de superusuário ou administrador que ignore o RLS, exceto durante migrations controladas?

## 2. Camada de Aplicação (API & Controllers)
- [ ] **Validação de IDOR:** As rotas que acessam ou modificam recursos específicos (ex: `PUT /api/orders/:id`) verificam se o recurso pertence ao `tenant_id` do usuário autenticado?
- [ ] **Contexto do Tenant:** O `tenant_id` é extraído do token de sessão de forma segura e passado corretamente para o serviço/repositório subjacente?
- [ ] **Filtros e Paginação:** As consultas baseadas em parâmetros recebidos pelo usuário estão livres de Query Injections que poderiam expor dados de outros tenants?
- [ ] **Injeção de Logs:** Os logs de eventos ou erros incluem a propriedade/tag `tenant_id` em vez de misturar saídas genéricas de vários clientes?
- [ ] **Mascaramento de IDs:** Os IDs expostos externamente (ex: em URLs ou respostas JSON) são opacos (UUIDs) para dificultar a enumeração por um atacante de outro tenant?

## 3. Serviços em Background (Queues & Cache)
- [ ] **Identificação de Tarefas:** Se houver adição de jobs assíncronos ou webhooks, o payload carrega de maneira explícita o `tenant_id`?
- [ ] **Contextualização de Workers:** O worker encarregado de processar o evento restabelece o contexto do tenant antes de acessar ou modificar dados, garantindo que o RLS atue?
- [ ] **Isolamento de Cache:** Se novos dados forem cacheados (ex: Redis), a chave de cache incorpora o prefixo ou namespace do `tenant_id` correspondente?

## 4. Testes e Evidências
- [ ] **Testes de Isolamento (Isolation Suite):** Há testes automatizados demonstrando que um `tenant_id` A **NÃO** consegue acessar, editar ou visualizar recursos pertencentes ao `tenant_id` B?
- [ ] **Cobertura Positiva e Negativa:** Os testes incluem cenários felizes e cenários de acesso negado (ex: Retorno 403 Forbidden ou 404 Not Found)?
- [ ] **Sem Dependência de Estado Global:** Os testes são executados em transações isoladas, de modo que dados inseridos pelo teste de um tenant não afetem outro teste ou suíte executada em paralelo?
