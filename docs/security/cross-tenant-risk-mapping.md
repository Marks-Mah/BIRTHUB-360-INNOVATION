# Mapeamento de Riscos de Vazamento Cross-Tenant

Este documento detalha os potenciais riscos de vazamento de dados entre tenants (cross-tenant leakage) em cada camada da arquitetura do BirthHub360, juntamente com suas mitigações.

## 1. Camada de API (Application Layer)

### Riscos Identificados:
*   **Insecure Direct Object Reference (IDOR):** Um usuário do Tenant A tenta acessar um recurso do Tenant B modificando o ID na URL (ex: `/api/v1/orders/123` para `/api/v1/orders/124`).
*   **Contextamento Inadequado:** O contexto do tenant não é corretamente definido na requisição, levando a aplicação a assumir um tenant padrão ou global.
*   **Vazamento de Dados em Respostas de Erro:** Exceções detalhadas ou logs de erro retornados na API que incluem IDs, nomes ou metadados de outros tenants.

### Mitigações:
*   **Autenticação Obrigatória:** Validar tokens JWT e extrair o `tenant_id` seguro a partir do token de sessão.
*   **Middleware de Contexto:** Garantir que todas as requisições autenticadas definam o contexto do tenant antes de acessar recursos sensíveis.
*   **Mascaramento de IDs:** Utilizar IDs opacos (ex: UUIDs) em vez de inteiros sequenciais para dificultar enumeração.
*   **Tratamento Centralizado de Erros:** Mascarar erros internos e evitar expor informações confidenciais do banco de dados na resposta HTTP.

## 2. Camada de Banco de Dados (DB Layer)

### Riscos Identificados:
*   **Bypass de RLS:** Acesso aos dados via contas super-user, contas de migração ou esquecimento de aplicar políticas RLS em novas tabelas.
*   **Query Injection Cross-Tenant:** Manipulação de parâmetros de paginação, filtros ou buscas (ex: `WHERE tenant_id = 'A' OR 1=1`) para acessar dados de terceiros.
*   **Timing Attacks em Queries Complexas:** Consultas que retornam falsos/verdadeiros demorando mais tempo dependendo se um registro (mesmo de outro tenant) existe.

### Mitigações:
*   **Aplicação Rigorosa de RLS:** Todas as tabelas que contenham dados de clientes devem ter a coluna `tenant_id` e políticas RLS ativas. Exigir revisão humana ou ferramentas de lint (ex: pre-commit hooks) para novas tabelas.
*   **Conexões Limitadas:** A aplicação deve se conectar ao banco usando uma role com permissões restritas e que respeite as políticas RLS.
*   **Parametrização Segura de Consultas:** Evitar injeção SQL usando ORMs e drivers que parametrizam as consultas por padrão.

## 3. Camada de Cache (Cache Layer - ex: Redis)

### Riscos Identificados:
*   **Colisão de Chaves (Key Collisions):** O Cache armazena dados utilizando chaves genéricas (ex: `user:123`), o que pode fazer com que um tenant acesse o dado cacheados por outro tenant com o mesmo ID interno.
*   **Vazamento de Sessões Cross-Tenant:** O ID da sessão de um usuário vaza e permite que ele acesse os recursos de outra organização sem autorização.

### Mitigações:
*   **Prefixação de Chaves com Tenant ID:** Toda chave de cache que armazena dados específicos do cliente deve incluir o `tenant_id` em sua estrutura (ex: `tenant:org_abc:user:123`).
*   **Políticas de Evicção Isoladas:** Configurar as políticas do Redis ou usar namespaces/bancos lógicos para garantir que o clear/flush de cache afete apenas os dados do respectivo tenant.
*   **Isolamento Opcional por Clusters (Premium Tiers):** Para clientes Enterprise, oferecer clusters ou nós de cache dedicados.

## 4. Camada de Filas (Queue Layer)

### Riscos Identificados:
*   **Processamento de Mensagens com Contexto Ausente:** Workers que processam jobs assíncronos não têm conhecimento de qual tenant a mensagem pertence.
*   **Execução de Tarefas Cross-Tenant (Spill-over):** Um evento enfileirado por Tenant A é processado e, devido a um bug na passagem de contexto, afeta os dados de Tenant B.
*   **Vazamento de Dados nos Payloads:** O conteúdo sensível é armazenado em cleartext na fila (ex: SQS, RabbitMQ).

### Mitigações:
*   **Inclusão Obrigatória do Tenant no Payload:** Todos os jobs assíncronos e eventos devem incluir explicitamente o `tenant_id` no cabeçalho ou payload da mensagem.
*   **Contextualização Inicial do Worker:** A primeira etapa de cada worker deve ser inicializar o contexto do banco de dados com base no `tenant_id` contido na mensagem (ativando RLS para aquela transação específica).
*   **Criptografia em Trânsito e Repouso:** Garantir que o serviço de mensageria utilize criptografia, minimizando riscos de exposição de dados não intencionais.

## 5. Camada de Logs (Logs Layer)

### Riscos Identificados:
*   **Log Injection / Data Bleeding:** Injeção de registros de eventos onde mensagens de um tenant contêm dados ou parâmetros pertencentes a outro.
*   **Vazamento em Dashboards/Buscas Globais:** Sistemas de monitoramento e pesquisa de logs exibem indevidamente informações que quebram o isolamento visual entre os dados.
*   **Exportação Cruzada:** Ferramentas de suporte exportam logs que contêm informações sensíveis de múltiplos tenants indevidamente misturados.

### Mitigações:
*   **Tagging Obrigatório:** Toda entrada de log da aplicação deve ter a tag ou propriedade `tenant_id` atrelada automaticamente através de interceptores/middlewares.
*   **Acesso Baseado em Contexto para Suporte:** A interface de logs e suporte deve possuir filtros estritos baseados no ID do tenant antes de qualquer busca em texto livre.
*   **Exclusão de PII/Dados Sensíveis:** Utilizar filtros para mascarar dados sensíveis, garantindo que o log armazene informações operacionais e não as cargas úteis de negócios confidenciais.
