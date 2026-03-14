# Política de Configuração de Ambientes e Serviços

Para garantir que os Agentes de RevOps do BirthHub 360 e as aplicações base se comportem de forma determinística e segura em diferentes estágios (Local, Staging, Production), esta política detalha a classificação de todas as variáveis do sistema e como elas devem ser gerenciadas, de acordo com as diretrizes aprovadas no `ADR-004`.

## Classificação dos Valores de Configuração

Cada valor de inicialização consumido pela aplicação (TypeScript, Python, Terraform) DEVE cair em uma destas três categorias:

### Categoria A: Configuração Estática de Build (Code / Hardcoded)

Valores que dizem respeito à lógica interna do negócio ou características estruturais imutáveis do ambiente de execução. Se houver necessidade de mudança, **o código deve ser alterado e redeployado**.

- **Onde reside:** Arquivos TypeScript constantes (ex: `constants.ts`), Enums do Prisma, ou `ConfigClasses` em Python.
- **Exemplos de Valores:**
  - `MAX_RETRY_ATTEMPTS_LLM = 3` (Limites de retentativas em agentes).
  - `SUPPORTED_LOCALES = ["pt-BR", "en-US", "es-ES"]`.
  - `DEFAULT_PORT = 3000` (Embora a porta de runtime seja Injected Env).
- **Justificativa:** Estas variáveis são essenciais para testes unitários isolados não falharem por falta de um `.env` obscuro e previnem bugs silenciosos de infraestrutura de runtime.

### Categoria B: Variáveis de Ambiente (Environment Variables Dinâmicas)

Valores que **mudam** conforme o ambiente onde o software está sendo executado, garantindo a natureza _Environment Agnostic_ de nossa infraestrutura serveless (Twelve-Factor App).

- **Onde reside:** Injetadas no OS (via `export`), arquivo `.env` para rodar Localmente, definições do Cloud Run, ou Helm Charts Kubernetes via ConfigMaps.
- **Exemplos de Valores:**
  - `NODE_ENV=production` ou `ENV=staging`
  - `DATABASE_HOST=postgres-cluster.internal` (Não a senha completa!)
  - `REDIS_URL=redis://redis-server:6379`
  - `LOG_LEVEL=info` (ou `debug` em ambiente de testes).
  - Feature Toggles globais básicos: `ENABLE_EXPERIMENTAL_RAG=true`
- **Justificativa:** Variam por deploy. O banco local tem um IP, o staging tem outro IP. São injetados pelo pipeline CI/CD diretamente na plataforma Cloud para os containeres. Seus vazamentos acidentais (ex: logando o IP do banco de staging) trazem risco mitigado desde que as redes sejam privadas.

### Categoria C: Cofres de Segredos (Secrets Vaults - KMS)

Valores críticos, estritamente confidenciais. Geralmente autenticação, tokens, senhas ou strings de conexão criptografadas com credenciais injetadas. Se caírem em domínio público resultam em _Incidentes Críticos de Segurança_.

- **Onde reside:** Google Secret Manager / AWS Secrets Manager / Hashicorp Vault. Eles NUNCA constam em `ConfigMaps` limpos e jamais no `git`. São referenciados nos manifestos (ex: `infra/cloudrun/service.yaml`) apontando para as versões (`latest` ou específicas) do Secret no Vault, de forma que o Cloud Run monta essas chaves no runtime como Env Vars para os apps através de permissão restrita de Service Accounts IAM.
- **Exemplos de Valores:**
  - `DATABASE_URL` (com username e password string completa `postgres://user:pass@host/db`)
  - `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `CLICKSIGN_TOKEN`
  - `JWT_SECRET` (para assinar os tokens).
- **Justificativa:** Proteção máxima. Acesso restrito a engenheiros SRE/DevOps. Rotação simplificada (mudando versão no painel da Cloud, seguido de deploy da infra) sem necessidade de re-escrever e testar código.

## Validação no Startup (Fail-Fast)

Não importa de qual das três categorias a variável veio (A, B ou C), todas as variáveis que chegam como EnvVars no Node/Python devem ser validadas imediatamente no _boot_ da aplicação:

- **TypeScript:** Usando um schema `Zod` (ex: `const env = envSchema.parse(process.env)`).
- **Python:** Usando `Pydantic BaseSettings` (ex: `class Settings(BaseSettings): db_url: str`).
  A falta de uma variável da categoria C ou B abortará a subida da API / Agente com log claro (`"Missing environment variable: OPENAI_API_KEY"`).
