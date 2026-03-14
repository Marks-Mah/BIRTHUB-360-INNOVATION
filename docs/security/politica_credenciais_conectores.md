# Política de Gerenciamento de Credenciais em Conectores

A segurança das informações dos clientes (Tenant Data) é a prioridade zero do BirthHub360. Esta política rege como as credenciais (API Keys, OAuth Tokens, Basic Auth) para integrações de terceiros devem ser manipuladas pelos Conectores dentro dos Agent Packs.

## 1. Armazenamento Seguro (Secret Manager)

*   **Proibição Absoluta:** É estritamente proibido armazenar credenciais ou tokens diretamente no código-fonte, nos arquivos `.env` do repositório final ou dentro do StateGraph do Agente (`state.context`).
*   **Repositório Central:** Todas as credenciais de clientes devem ser armazenadas de forma criptografada em um cofre gerenciado central (ex: AWS Secrets Manager, HashiCorp Vault ou tabela fortemente criptografada no banco de dados isolado com KMS keys).
*   **Recuperação Just-In-Time:** Os conectores buscarão os tokens (ou client secrets) necessários, em cache temporário (TTL curto), apenas no momento exato em que a Tool for disparada pelo LLM.

## 2. Princípio do Menor Privilégio (Least Privilege Principle)

*   Ao desenhar um OAuth Flow para um conector (ex: Google Workspace), as "Scopes" solicitadas ao administrador do Tenant não podem ser globais ou de "Super Admin".
*   *Exemplo Positivo:* Solicitar `https://www.googleapis.com/auth/calendar.events` (Para um Agente LDR/SDR criar reuniões).
*   *Exemplo Negativo:* Solicitar `https://www.googleapis.com/auth/calendar` (Controle total incluindo apagar calendários inteiros).

## 3. OAuth 2.0 vs API Keys Estáticas

1.  **Preferência Tecnológica:** Sempre que o provedor externo oferecer, o conector deve implementar um fluxo OAuth 2.0 (Authorization Code Grant), para que as ações da API ocorram em nome do usuário final.
2.  **API Keys Estáticas (Exceção):** Somente aceitáveis para integrações M2M (Server-to-Server) globais que não lidem com o contexto atrelado ao usuário (ex: APIs meteorológicas genéricas ou consultas públicas a CNPJs).
3.  **Refazendo Tokens OAuth:** O Conector (`BaseConnector`) é o único encarregado por monitorar o `expires_in` e efetuar chamadas `/oauth/token` com o `refresh_token` de forma atômica e atualizá-lo no Secret Manager. O Agente ou a Tool não podem e nem devem lidar com expiração de token.

## 4. Política de Rotação (Rotation Policy)

*   **Tokens (OAuth):** Rotação automática e gerida via fluxos HTTP de provedores.
*   **Chaves de Autenticação / Webhook Secrets Internas:** Devem ser rotacionadas a cada 90 dias através da plataforma ou console Cloud, disparando eventos que forcem o reinício (HUP signal) ou a invalidação do cache no Gateway e nos workers do LangGraph.
