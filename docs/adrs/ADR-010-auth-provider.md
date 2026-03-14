# ADR 010: Escolha do Provedor de Autenticação (NextAuth/Auth.js vs Supabase)

## Status
Aceito

## Contexto
O BirthHub360 necessita de um sistema de autenticação robusto e escalável para suportar sua arquitetura Multi-tenant. Precisamos escolher entre implementar nosso próprio provedor utilizando bibliotecas como NextAuth/Auth.js ou utilizar um serviço de Backend-as-a-Service (BaaS) como o Supabase Auth.

## Decisão
Optou-se por adotar uma implementação de autenticação própria baseada em **NextAuth/Auth.js** (Credentials e provedores OAuth), integrada com nosso banco de dados.

## Justificativa
*   **Vendor Lock-in:** Reduzimos a dependência de serviços externos e seus modelos de precificação.
*   **Controle Total (Escalabilidade):** Autenticação in-house nos dá controle completo sobre o fluxo de login, emissão de tokens, regras de Multi-tenant (isolamento) e criptografia.
*   **Flexibilidade Multi-tenant:** Precisamos amarrar de forma rígida a autenticação ao fluxo de RBAC baseado em TenantId, o que requer personalização que ferramentas como NextAuth facilitam.

## Estratégia de Tokens e Criptografia
*   **Tokens:** Acesso será gerenciado via JWT. Access Tokens terão expiração curta (**15 minutos**), enquanto Refresh Tokens terão expiração longa (**7 dias**), forçando a validação contínua de privilégios no banco.
*   **Criptografia:** Como estamos usando um provedor de credenciais (Credentials provider), a criptografia de senhas utilizará obrigatoriamente algoritmos modernos e seguros (preferencialmente **bcrypt** ou **argon2**) com um fator de custo (salt rounds) mínimo de **12**.
*   **Introspection M2M:** Serviços internos e microserviços validarão os tokens às cegas através de endpoints de Introspection, que devem obrigatoriamente validar os claims: `sub`, `aud`, `iss` e `tenant`.

## Consequências
*   Maior esforço inicial de engenharia em comparação com o uso do Supabase.
*   Necessidade de gerenciar a segurança do armazenamento de senhas e a infraestrutura de envio de e-mails para recuperação/magic links.
*   Maior autonomia e previsibilidade de custos operacionais a longo prazo.
