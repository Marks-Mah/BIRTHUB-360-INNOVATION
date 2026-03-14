# Threat Model de Configuração

Esta seção analisa o impacto de um vazamento de configuração de ambiente crítico no ecossistema do BirthHub 360, focando nas chaves que oferecem acesso aos domínios sensíveis da operação RevOps. O objetivo é compreender o "Blast Radius" (raio de explosão) e planejar mitigações de segurança.

## Atores e Vetores de Ataque (Threat Vectors)

- **Vazamento de Código Fonte**: Se o `.env` de produção for indevidamente commitado.
- **SSRF / LFI / Injections**: Se o API Gateway for explorado para ler variáveis expostas como `/proc/self/environ` do container ou listar variáveis na resposta HTTP 500.
- **Log Forging/Spill**: Se um log (ex: Stack Trace não tratado de ORM Prisma ou Python SQLAlchemy) jogar o DSN do banco de dados completo na saída padrão e acabar indexado na ferramenta de Logs com acesso global para outros times.
- **Acesso Abusivo IAM**: Alguém que obteve permissão restrita e gerou/visualizou os "Secrets" na Cloud.

## Análise de Impacto de Vazamento (Blast Radius) por Variável Crítica

| Variável / Chave                           | Dominio / Componente Afetado                         | Severidade do Impacto | Potencial Danoso e Risco                                                                                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` (String completa com senha) | Persistência / `packages/db` e Prisma                | **Crítica (P0)**      | Permite acesso "root" ou "read/write" massivo à base de dados. O atacante pode extrair PII, manipular leads, deletar contas e paralisar toda a aplicação. Acesso direto depende de firewall da nuvem (VPC).   |
| `STRIPE_SECRET_KEY` ou `PAGARME_KEY`       | Financeiro / `agents/financeiro` e Pagamentos        | **Crítica (P0)**      | Permite manipulação de faturamento, emissão de reembolsos massivos ("refund attack"), alteração de planos dos clientes e exposição da conta do Gateway de Pagamento, incorrendo em perda de receita imediata. |
| `OPENAI_API_KEY` ou `GEMINI_API_KEY`       | Inteligência Artificial / Todos os Agentes LangGraph | **Alta (P1)**         | Permite sequestro de uso da API de IA ("Credit Draining"). O atacante pode fazer chamadas de prompts imensas usando o budget do BirthHub 360, resultando em uma fatura astronômica na provedora LLM.          |
| `CLICKSIGN_TOKEN` ou Docusign              | Jurídico / `agents/juridico`                         | **Alta (P1)**         | Possibilita a adulteração ou o envio de contratos maliciosos ou falsificados em nome do BirthHub para clientes B2B. Impacto drástico em marca (Reputação) e Compliance jurídico.                              |
| `JWT_SECRET` (Supabase ou Custom Auth)     | Autenticação / `apps/api-gateway` e Next.js          | **Crítica (P0)**      | Permite a falsificação imediata ("forging") de tokens JWT de administrador. O atacante entra no sistema no papel de qualquer usuário, assumindo controle total da Dashboard de qualquer Tenant.               |
| `SLACK_BOT_TOKEN` / Webhooks               | Notificação e Alertas                                | **Média (P2)**        | O atacante pode emitir alertas falsos, realizar spoofing de mensagens no slack ou vazar a lista de usuários internos do workspace. Baixo risco para clientes B2B diretamente.                                 |

## Controle Compensatório (Mitigação)

### 1. Hardening do Runtime (Prevenção)

Para neutralizar vetores como SSRF, implementamos tratamento estrito de exceções genéricas (`ErrorHandler Middleware`) para nunca expor a requisição que gerou falha junto a variáveis de ambiente no Payload do Response de erro `500 Internal Server Error`.
A `Pydantic BaseSettings` utilizada pelos agentes Python deve proibir dumps (`model_dump`) logando o dict completo de credenciais.

### 2. Isolação VPC / Cloud Run (Prevenção de Acesso DB)

Se o `DATABASE_URL` vazar, o Banco de Dados (Cloud SQL) em si está restrito à rede VPC. A string não funciona a partir de um IP público aberto. O atacante precisaria também comprometer e rotear o ataque a partir da nuvem ou de uma VPN autorizada.

### 3. Detecção e Revogação Ativa

Utilizamos Scanners de Segurança de Dependências/Credenciais (ex: GitGuardian, GitHub Secret Scanning) na pipeline de Pull Requests. Se o CI/CD detectar uma formatação similar a um JWT Secret ou OpenAI Token, o PR será rejeitado.
Para as APIs que suportam "Revogação Rápida", acionaremos o [Runbook de Rotação de Secret] (docs/secrets-management-policy.md) imediatamente.
