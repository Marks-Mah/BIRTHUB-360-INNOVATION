# Análise de Risco: Query Injection via Parâmetros de Filtro e Paginação

Este documento detalha os potenciais riscos de Query Injection (injeção de consultas), especificamente focando na manipulação de parâmetros enviados na URL ou no corpo das requisições, comuns em operações de listagem, filtro dinâmico, ordenação e paginação no BirthHub360.

## 1. Contexto e Funcionamento das Injeções (Query Injections)

No contexto do BirthHub360, "Query Injection" refere-se à capacidade de um usuário mal-intencionado enviar dados não sanitizados em endpoints REST/GraphQL, levando o backend a construir uma consulta SQL não intencional ou a alterar o comportamento esperado de filtros que devem operar de forma controlada.

### O Problema Central em Parâmetros Dinâmicos
APIs frequentemente aceitam parâmetros dinâmicos na URL (ex: `?sort=created_at&order=DESC&filter[status]=PAID`). O perigo reside em concatenar essas strings diretamente nas queries SQL ou na interpretação insegura por ORMs de ordenação de colunas e limites.

### A Camada de RLS (Row-Level Security)
O PostgreSQL Row-Level Security é nossa primeira linha de defesa contra vazamentos de dados (Cross-Tenant) e deleção acidental/maliciosa. No entanto, o RLS não impede ataques de injeção que manipulem ordenação, extraiam metadados via mensagens de erro (Error-Based SQLi) ou alterem a lógica de busca dentro dos limites do tenant atacante, podendo causar negação de serviço (DDoS/Slow Queries).

## 2. Cenários de Risco e Análise Detalhada

### Cenário 2.1: Injeção na Cláusula de Ordenação (`ORDER BY`)

**Risco:** Atacante envia um parâmetro de ordenação não validado (ex: `?sort=CASE WHEN (SELECT 1)=1 THEN name ELSE id END`).
**Impacto:**
*   **Ataque Baseado em Tempo/Erro:** Extração de dados booleanos ocultos através de avaliação de funções condicionais dentro da cláusula `ORDER BY` que altera a velocidade da resposta (Blind SQLi).
*   **Degradação de Performance:** Forçar o banco a ordenar tabelas de forma não indexada ou computacionalmente cara.
**Mitigações (Regras de Implementação):**
*   **Allowlisting de Colunas:** A aplicação nunca deve interpolar strings de `sort` diretamente. As colunas permitidas para ordenação devem estar em uma lista branca rigorosa (ex: `ALLOWED_SORT_FIELDS = ['created_at', 'name', 'status']`). Se o valor recebido não constar, rejeitar a requisição com Erro 400.
*   **Validação do Sentido da Ordenação:** O parâmetro de direção (`ASC` / `DESC`) deve ser estritamente validado por Enumeração/Casting no código.

### Cenário 2.2: Injeção em Operadores de Filtro Dinâmico (ex: `?filter[name][like]=%admin%`)

**Risco:** Sistemas que constroem dinamicamente cláusulas `WHERE` baseadas em dicionários de query-strings.
**Impacto:**
*   **Complexidade Computacional (DDoS):** Atacante envia padrões regex pesados (`~*`) ou operadores `LIKE` maliciosos (ex: `?filter[description][ilike]=%a%b%c%d%e%f%`) forçando varreduras sequenciais completas que sobrecarregam a CPU do banco de dados.
*   **Operadores Inseguros:** Envio de parâmetros ou operadores que a aplicação converte diretamente para código SQL (ex: `$raw`, `$expr` em alguns ORMs), resultando na modificação da cláusula.
**Mitigações (Regras de Implementação):**
*   **Restrição de Operadores (Allowlist):** O backend deve mapear operadores válidos na URL (`eq`, `gt`, `lt`, `like`) de volta para uma lista segura de operadores de banco suportados.
*   **Parametrização Obrigatória:** Os valores do filtro *nunca* devem ser interpolados. Devem ser sempre passados através dos parâmetros vinculados do driver/ORM (ex: `$1`, `$2`).
*   **Sanitização e Limitação de Curingas (`%`):** Se buscas `LIKE` ou Full-Text forem expostas, os caracteres de curinga recebidos do cliente devem ser desativados ou escapados, a menos que seja um recurso intencional. E queries pesadas devem ser delegadas para ferramentas adequadas (Ex: Elasticsearch).

### Cenário 2.3: Injeção de Paginação (Limits e Offsets Maliciosos)

**Risco:** Manipulação dos parâmetros `limit` (ou `per_page`) e `offset` (ou `page`). (ex: `?limit=999999999&offset=-1`).
**Impacto:**
*   **Exaustão de Memória / Negação de Serviço (DoS):** O banco tenta alocar memória para retornar bilhões de linhas ou a aplicação sofre Out-Of-Memory (OOM) ao tentar desserializar o resultado num único JSON gigante.
*   **Exceções Não Tratadas:** Parâmetros negativos ou não numéricos não tratados quebram a execução, enchendo os logs de alertas.
**Mitigações (Regras de Implementação):**
*   **Validação de Tipo:** Garantir que `limit` e `offset` sejam *sempre* convertidos e validados como inteiros positivos no início da requisição (ex: usando Pydantic, Zod, ou Schemas do FastAPI).
*   **Limites Máximos Rígidos (Hard Caps):** O parâmetro de `limit` não deve ser arbitrário. Implementar um teto máximo inegociável em nível de API (ex: `MAX_LIMIT = 100` ou `500`), ignorando qualquer valor superior enviado pelo cliente.

## 3. Diretrizes Finais de Revisão e Automação

1.  **Ferramentas de ORM Modernas:** É expressamente proibido no BirthHub360 o uso de queries "Raw SQL" construídas via formatação de strings em endpoints públicos sem validação técnica isolada (code review de segurança e auditoria). O uso de query builders modernos (Prisma, Drizzle, SQLAlchemy) é o padrão ouro que implementa mitigação por default.
2.  **Linting e Testes:** Os testes de integração devem incluir fuzzing nos parâmetros de query (testar valores como `1; DROP TABLE users;--`, limites altos, operadores estranhos) garantindo que o backend retorne validações 400 seguras ou trate como string literal nas queries e não estoure 500s.