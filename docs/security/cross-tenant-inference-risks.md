# Análise de Risco de Inferência Cross-Tenant (Timing Attacks e Enumeração)

Este documento descreve as análises de risco associadas a técnicas de inferência que podem ser usadas por um invasor (seja um usuário malicioso de outro tenant ou um externo) para descobrir informações sobre outros tenants no ambiente do BirthHub360.

## 1. Timing Attacks (Ataques de Tempo)

Os Timing Attacks ocorrem quando um sistema responde de maneira diferente (em milissegundos ou segundos) dependendo da presença ou ausência de uma informação. No contexto Multi-Tenant, isso pode permitir que um invasor determine a existência de registros de outras organizações.

### Cenários de Risco:
-   **Buscas e Filtros Complexos (ex: JOINs com tabelas de outros tenants):** Uma consulta que tenta filtrar dados por um ID de outro tenant pode demorar mais se o registro existir (pois avalia outras condições antes de falhar no RLS) e ser muito rápida se o ID não existir no banco como um todo.
-   **Validação de E-mails / Usuários (ex: "E-mail já cadastrado"):** Durante convites ou criações de conta, um invasor pode enumerar e-mails descobrindo se o tempo de resposta da API para "E-mail já em uso" é diferente de um "E-mail não encontrado".
-   **Pesquisas Criptográficas (ex: Hash de Senhas):** O tempo de processamento de algoritmos pesados (bcrypt/Argon2) pode denunciar se um usuário ou convite de outro tenant é válido.
-   **Recuperação de Senha ou Reset:** As APIs de esquecimento de senha podem vazar tempo de busca de e-mail vs cálculo do token, permitindo a enumeração de usuários pertencentes a outras organizações.

### Estratégias de Mitigação:
-   **Respostas Constantes (Constant-Time Responses):** Implementar verificações de segurança usando `crypto.timingSafeEqual()` para comparação de hashes ou tokens, e evitar validações precoces.
-   **"Fake" Processing (Processamento Falso):** Para endpoints de login, cadastro, ou reset de senha, garantir que o cálculo de hash (ex: bcrypt) seja simulado para e-mails inexistentes, igualando o tempo de resposta a um login válido.
-   **Verificação Explícita de RLS:** Garantir que o `tenant_id` seja verificado imediatamente na entrada da query (ex: via RLS). Assim, se o `tenant_id` não coincidir com o do contexto do usuário, a pesquisa não avança para index scans mais complexos, mitigando assim as discrepâncias de tempo de I/O de banco.
-   **Filas e Processamento Assíncrono:** Para processos de importação ou criação em massa, retornar um ID de Job imediatamente (ex: HTTP 202 Accepted) e processar as restrições e unicidade nos workers background, escondendo o tempo de processamento.

## 2. Enumeração de Organizações e Recursos

A Enumeração (Enumeration) ocorre quando um invasor utiliza sequências previsíveis, brute force ou scraping para descobrir dados sensíveis, IDs, ou metadados de outros tenants.

### Cenários de Risco:
-   **IDs Sequenciais (Auto-Increment) em URLs:** Uso de inteiros sequenciais (ex: `/api/orders/1`, `/api/orders/2`) facilita a contagem e estimativa do volume de negócios do BirthHub360 ou de tenants vizinhos.
-   **Enumeração de Slugs (ex: `/org/empresa-a`):** Uma API que retorna HTTP 403 (Forbidden) quando o slug existe (mas não pertence ao usuário) e 404 (Not Found) quando o slug é livre, permitindo listar nomes de clientes do sistema.
-   **Erros Verbosos da API:** Mensagens de erro contendo dados ou referências diretas do banco (ex: "Key (tenant_id, email)=(tenant_b, test@b.com) already exists") que evidenciam a existência de entidades em outras organizações.

### Estratégias de Mitigação:
-   **Uso Obrigatório de UUIDs:** Substituir todos os IDs sequenciais externos (expostos em URLs ou payloads JSON) por UUIDs v4, impedindo ataques de travessia (Directory Traversal / IDOR).
-   **Padronização de Retorno (404 Not Found em vez de 403 Forbidden para Recursos Não Pertencentes):** Para qualquer recurso restrito por RLS, se um usuário tenta acessá-lo informando um ID válido, mas que pertence a outro tenant, a API **deve retornar HTTP 404 (Não Encontrado)**. Retornar 403 informa ao invasor que o recurso existe, facilitando a enumeração.
-   **Limite de Taxa (Rate Limiting) Estrito:** Implementar throttling agressivo em endpoints de convites, login, e buscas (ex: limite de 5 requisições de erro por minuto) para bloquear bots de brute force ou enumeradores de IDs/Slugs.
-   **Tratamento Centralizado de Exceções:** Configurar a API para nunca expor erros de validação da base de dados. Em vez disso, converter as exceções subjacentes (ex: `PostgresError`) em mensagens genéricas (ex: "Recurso não encontrado ou inválido") de modo que não haja diferença visual em cenários de fraude.
