# Análise de Risco: Ataques de Tempo (Timing Attacks) Cross-Tenant

Este documento é aprofundamento do "Risco de Inferência" e analisa especificamente se variações microscópicas no tempo de resposta da API do BirthHub360 permitem que um invasor (um cliente em seu próprio Tenant) deduza a existência, o tamanho, ou o processamento de dados pertencentes a outro cliente (Tenant).

## 1. O Problema Fundamental: Vazamento de Informação pelo Tempo

Um ataque de tempo (Timing Attack) ocorre quando o tempo que o sistema leva para processar e retornar uma requisição revela indiretamente informações confidenciais ou a ramificação de código (`if/else`) que o servidor executou internamente, mesmo que o retorno na tela seja genérico (ex: `HTTP 404`).

### O Vetor de Ataque "Cross-Tenant"
Em uma base *Shared Schema* (com RLS), os dados de todos os clientes estão na mesma tabela.

**Cenário Hipotético:**
Um invasor no Tenant A quer descobrir se o seu principal concorrente (Tenant B) é cliente ativo do BirthHub360.
1. O invasor cria um script que tenta registrar o Subdomínio (Slug) `nome-do-concorrente`.
2. Se a API faz uma busca em banco `WHERE slug = 'nome-do-concorrente'` e imediatamente diz "Indisponível", demorando **10ms**.
3. O invasor tenta o slug `asdfghjkl`, a API checa que não existe e insere, ou processa mais, demorando **200ms**.
4. Pela diferença de 190ms, o invasor "lê" a existência do registro antes mesmo de o servidor responder.

## 2. Cenários Avaliados na Infraestrutura BirthHub360

### Cenário 1: Operações Condicionais e Hash de Criptografia
*   **Ameaça:** Durante o fluxo de reset de senha ou verificação de chaves da API, se o usuário do Tenant A fornecer o e-mail/ID de um admin do Tenant B, o sistema busca a linha (não acha devido ao RLS, ou acha e bloqueia) e retorna "Erro". Se ele fornecer um e-mail que não existe em lugar nenhum, o sistema falha mais rápido pois não calcula o bcrypt.
*   **Avaliação:** **Risco Alto**.
*   **Resolução (Padrão Time-Safe):** A verificação de e-mails deve sempre gastar tempo constante (ou calcular um "Dummy Hash" se o e-mail não for encontrado) antes de responder "Credenciais Inválidas". Funções de comparação de tokens devem usar rotinas seguras como `hmac.compare_digest` (Python) em vez do operador simples `==`, que para no primeiro caractere diferente.

### Cenário 2: RLS (Row-Level Security) e Índices
*   **Ameaça:** Uma consulta indexada `WHERE id = 'uuid_concorrente'` resolve muito rápido. Porém, se houver um JOIN complexo antes de aplicar o filtro RLS, o PostgreSQL vai construir o loop. O invasor manda uma query gigante buscando um UUID que não é dele. O tempo de execução da query vai denunciar se o registro existe no HD antes de ser rejeitado pelo filtro de segurança final.
*   **Avaliação:** **Risco Moderado**.
*   **Resolução:** A regra estrita de "Índice Prefixado por Tenant" (Ver *Index Creation Policy*) resolve este problema. Ao colocar o `tenant_id` como primeira cláusula da B-Tree, a query do Invasor é abortada diretamente na raiz do índice (Pois ele não tem o Tenant B na sessão). Ele não avalia as outras tabelas. Para o banco, buscar o ID do concorrente ou um ID inventado custa o mesmo tempo: *Index Scan de 0 linhas retornadas*.

### Cenário 3: Rate Limiting e Caching Compartilhado
*   **Ameaça:** O invasor faz uma requisição massiva e mede o tempo. Se o cache responder em 2ms, ele sabe que outro usuário acabou de consultar aquele endpoint.
*   **Avaliação:** **Risco Baixo a Médio**.
*   **Resolução:** Chaves de cache baseadas fortemente em Prefixos (`tenant:xyz:resource`). Um invasor nunca consegue "esbarrar" na chave do Tenant vizinho e o tempo do cache Hit/Miss afeta apenas o domínio fechado dele próprio.

## 3. Conclusão da Análise
O uso de Random UUIDs (v4) na plataforma inteira, ao invés de inteiros/slugs e a política de "Erro 404 Cego (Blind Not Found)" atrelada a Índices Prefixados no PostgreSQL, mitigam 95% do risco de Timing Attack. A adoção de "Constant Time" nas funções criptográficas do Autenticador resolve os últimos 5%, tornando o BirthHub360 imune a inferência por latência.