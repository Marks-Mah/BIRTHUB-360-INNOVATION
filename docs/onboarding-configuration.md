# Guia de Onboarding: Configuração Local

Bem-vindo(a) ao time de engenharia do BirthHub 360! Este guia vai mostrar exatamente o passo a passo para configurar as variáveis de ambiente necessárias para rodar o monorepo localmente (Turborepo + pnpm) sem dor de cabeça e sem estressar a segurança do projeto. 🚀

## 1. Instalando Dependências Base

Antes de mexer nas variáveis, certifique-se de que você possui:

- Node.js (v20+) e pnpm (v9+) instalados.
- Python (v3.12+). Sugerimos utilizar `pyenv` e `poetry/pipenv` para isolamento.
- Docker e Docker Compose instalados e em execução.
- Instale os pacotes básicos executando `pnpm install` na raiz.

## 2. Configurando o Ambiente (`.env`)

A política do projeto impede variáveis sigilosas versionadas. Por isso, utilizamos um `.env` local em sua máquina, que será injetado globalmente pelos scripts do Turborepo.

### Passo 1: O Boilerplate `.env.example`

Na raiz do repositório, existe o arquivo `.env.example`. Este arquivo tem **todos** os nomes das variáveis (`KEYS`) que os Agentes Python e Gateway Node.js esperam encontrar.
Faça uma cópia direta:

```bash
cp .env.example .env
```

### Passo 2: Variáveis do Docker-Compose (Banco e Redis)

Se você for rodar tudo via Docker local (`docker-compose up -d`), as strings padrão do `.env.example` para Postgres, Redis e ElasticSearch já estão corretas e mapeadas para `localhost:5432`, `localhost:6379`, etc. Você **não** precisa mudá-las, a não ser que tenha portas conflitando na sua máquina.

### Passo 3: Obtendo as "Secrets" de Terceiros (OpenAI, Stripe)

Para testar fluxos completos, como um Agente LDR fazendo _enrichment_ via LLM, você vai precisar de Chaves Reais (em modo Test/Sandbox).

> ⚠️ **Atenção:** NUNCA cole uma chave de PRODUÇÃO no seu `.env` local. Sempre peça chaves do ambiente "Sandbox" ou "Dev".

1. **OpenAI / Gemini:**
   - Peça ao Tech Lead a chave da "OpenAI Sandbox (Team BirthHub)" ou gere uma personal key provisória vinculada à conta org.
   - Atualize a linha `OPENAI_API_KEY=sk-xxxx...`

2. **Supabase / JWT Secret:**
   - Se o projeto utilizar JWT base, preencha o `JWT_SECRET` com uma string arbitrária forte (ex: `super-secret-dev-jwt-key`). Os testes E2E mockam isso internamente.

3. **Stripe (Agente Financeiro):**
   - Utilize a chave de teste pública e secreta (que começam com `pk_test_` e `sk_test_`).

### Passo 4: Subindo a Aplicação e Validando

O BirthHub usa tipagem estrita de variáveis com Zod/Pydantic no boot da aplicação.
Execute o projeto:

```bash
pnpm dev:all-workers
# Em outro terminal
pnpm dev
```

Se o seu `.env` estiver incompleto, você verá um erro fatal amigável logo na subida do console (`"Error: Missing environment variable 'OPENAI_API_KEY'"`). Volte, preencha o valor ausente e tente novamente.

## 3. Adicionando uma Nova Variável de Ambiente

Se você criar uma "Feature" que necessite de uma variável nova (ex: `HUBSPOT_TOKEN`):

1. **Nunca modifique só o seu `.env`.**
2. Adicione a chave vazia (ex: `HUBSPOT_TOKEN=""`) ou com um default dummy ao arquivo **`.env.example`** para que o próximo dev saiba que ela existe.
3. Adicione o schema no código TypeScript (ex: `z.string()` em `env.ts`) ou Python (`pydantic BaseSettings`).
4. Solicite ao Tech Lead (na abertura do PR) a adição do Secret no "Google Secret Manager / AWS Vault" dos ambientes de Cloud `Staging` e `Prod`.
