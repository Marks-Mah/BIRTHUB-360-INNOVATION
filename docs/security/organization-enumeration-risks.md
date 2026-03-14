# Análise de Risco: Enumeração de Organizações (Tenant Enumeration) via Slugs ou IDs Sequenciais

Este documento foca nos perigos da "Enumeração", que é a prática maliciosa de sondagem sistemática por parte de atacantes ou bots para inferir e descobrir informações de mercado. No caso de uma plataforma B2B como o BirthHub360, vazar quem são nossos clientes e quantos são é uma brecha grave de inteligência comercial.

A Enumeração ocorre principalmente quando o invasor tenta forçar erros 403 (Forbidden) e 404 (Not Found) contra a API.

## 1. O Problema das URLs de Recurso

Um invasor escreve um script que faz requisições iterativas a um endpoint:
`GET /api/v1/organizations/{id_ou_slug}/members`

### O Risco do ID Sequencial
Se o BirthHub360 expusesse IDs gerados sequencialmente (ex: a organização com id `1001`, depois `1002`, `1003`), o invasor iteraria sobre esses números para mapear exatamente a quantidade de novos cadastros diários (Insecure Direct Object Reference e Taxonomia).
*   **Ameaça:** O invasor monitora se amanhã o sistema está no id `1005`, deduzindo que o SaaS teve apenas 2 assinaturas em 24h. E ao receber "403 Você não pertence a organização 1002", ele sabe com 100% de certeza que o cliente "1002" existe.

### O Risco do Slug (Subdomínio Opcional)
Se o BirthHub360 expusesse e organizasse URLs ou Subdomínios customizados através de strings humanamente legíveis (ex: `apple.birthhub360.com` ou `/api/orgs/microsoft`), o invasor faria varreduras baseadas em dicionários de empresas da Fortune 500 (Brute Force de Slugs).
*   **Ameaça:** Se o atacante não pertence à organização "microsoft" e tentar um GET para os dados do dashboard deles, um erro ingênuo na API pode retornar um `HTTP 403 (Acesso Negado à Microsoft)`. Em contrapartida, tentar um GET para um slug não cadastrado como "empresa_nao_existente" pode retornar `HTTP 404 (Não Encontrado)`.
*   **Efeito:** O atacante descobre secretamente que a Microsoft é, de fato, cliente da nossa plataforma, extraindo a base de clientes da empresa (Customer List Bleeding).

## 2. Abordagem Mitigatória (Padrão Ouro e Anti-Enumeração)

No BirthHub360, a estratégia absoluta contra a Enumeração de Organizações será a seguinte:

1.  **Proibição Total de Inteiros Sequenciais em IDs Expostos:** Todas as entidades do banco (`organizations`, `users`, `orders`, etc.) **nunca** serão referenciadas externamente (API ou URL do Browser) através de chaves primárias ou incrementais numéricas. Serão obrigatoriamente UUIDs v4 pseudo-aleatórios e não adivinháveis (ex: `GET /api/orgs/123e4567-e89b-12d3-a456-426614174000`).
2.  **Padrão Uniforme de Resposta (Uniform Resource Rejection - 404 Not Found em vez de 403 Forbidden para Recursos Não Pertencentes):**
    *   Sempre que um usuário tentar acessar qualquer endpoint restrito passando um UUID genérico, um slug de terceiros, ou qualquer ID que *exista no banco, mas não pertença ao seu tenant_id verificado (Contexto/RLS)*, a API **nunca** deve confirmar se o ID de terceiros existe ou não.
    *   **Implementação:** Em vez de fazer uma verificação de duas etapas (`if (org_exists) { if (!user_belongs_to_org) return 403; }`), as consultas RESTFul devem sempre tentar buscar a intersecção exata do usuário com a organização (ex: `where id = uuid AND tenant_id = context_tenant`).
    *   A API retornará sempre o mesmo código amigável genérico **HTTP 404 (Não Encontrado ou Você não tem permissões para acessá-lo)**.
    *   Isso torna impossível para o atacante diferenciar (através do Status ou do payload JSON retornado) um ID que "existe mas ele não tem acesso" de um ID que foi "aleatoriamente inventado".

3.  **Endpoint Público Específico (White-Label / Cadastro Aberto):**
    *   **Exceção Segura:** O único endpoint que pode (e deve) confirmar a validade de um identificador comercial publicamente é o endpoint restrito do *Sign-Up*, onde o cliente checa se o nome/slug que ele quer registrar já foi tomado por outro.
    *   **Ameaça Controlada (Rate Limiting/Bot Protection):** Esse endpoint (`POST /api/onboarding/check-slug`) só retorna true/false, e é altamente rate-limited, além de protegido por reCAPTCHA invisível ou similar para evitar que bots raspem nomes em massa. Nenhum outro metadado além da disponibilidade do *slug* é repassado pela requisição.