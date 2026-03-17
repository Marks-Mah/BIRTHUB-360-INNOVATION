# ADR-004: Estratégia de Configuração (Env Vars vs Config Files vs Secrets Vault)

## Status

Accepted

## Context

O BirthHub 360 possui múltiplas camadas (Next.js, FastAPI, BullMQ Workers, API Gateway) que operam num monorepo e são servidas no Cloud Run e Google Cloud / AWS. O gerenciamento inadequado de configurações de sistema acarreta em riscos de segurança (vazamento de chaves), baixa agilidade no deploy (downtime por rotatividade de senhas), e falhas causadas por dessincronia de ambiente.
Precisamos de um padrão explícito que decida onde cada tipo de variável de configuração (Ex: Porta HTTP vs URL do Banco vs Feature Flags vs Chaves da OpenAI) vai habitar e como é acessado pelo código.

## Análise das Alternativas

**1. Variáveis de Ambiente (Env Vars)**

- _Prós_: Padronizado universalmente (Twelve-Factor App), fáceis de sobrescrever em Docker/Cloud Run sem rebuildar a imagem.
- _Contras_: Tendem a ficar bagunçadas se existirem centenas delas; muito propensas a vazamento ("Spill") se expostas em logs/erros sem filtragem adequada.

**2. Arquivos de Configuração Estáticos (JSON/YAML)**

- _Prós_: Suportam estruturas hierárquicas complexas (listas, dicionários aninhados), tipáveis via Zod ou Pydantic e commitáveis no Git (versão de controle).
- _Contras_: Necessitam de _rebuild_ ou _redeploy_ da aplicação inteira se o valor mudar (já que são assados dentro da imagem Docker).

**3. Cofres de Segredos (Secrets Vault)**

- _Prós_: Extremamente seguros, injetam os valores dinamicamente no runtime via KMS (Google Secret Manager / AWS Secrets Manager) sem exposição em disco. Útil para credenciais críticas.
- _Contras_: Atrasam levemente o tempo de "Cold Start" da função serveless. Necessitam gestão de acessos (IAM).

## Decision

Decidimos adotar um **Modelo Tripartite** de Configurações, agrupando as chaves conforme a sua sensibilidade e ciclo de vida:

1. **Valores Estáticos, Defaults Inofensivos e Estruturas Complexas:** Serão gerenciados por **Config Files estáticos (`config.ts`, `settings.py` com defaults hardcoded ou Pydantic BaseSettings)**.
   - _Exemplo_: Portas padrão (`PORT=3000`), Níveis de log padrão (`LOG_LEVEL=info`), Threshold de timeout (`TIMEOUT_MS=5000`), Lista de provedores LLM ativos (`["openai", "gemini"]`).

2. **Apontamentos Dinâmicos de Ambiente (Ambientes Variáveis):** Serão gerenciados por **Environment Variables (`.env` local, Injected Env Vars na Cloud)**.
   - _Exemplo_: Endereço de URLs internas não confidenciais (`REDIS_URL=redis://queue:6379`, `API_GATEWAY_URL=http://localhost:4000`, `NODE_ENV=production`).
   - São valores que diferem por "Environment" (Staging vs Prod), mas se vazarem não expõem diretamente dados do cliente.

3. **Credenciais, Tokens e Chaves (Segredos Críticos):** Serão obrigatoriamente injetados através de **Secret Vaults (Cloud Secret Manager)** montados no runtime do Cloud Run. O código lerá como variáveis de ambiente (pois o Cloud Run monta segredos assim nativamente), porém o gerenciamento é centralizado no Vault.
   - _Exemplo_: `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`. NENHUM deste tipo habita `yaml` local ou hardcode.

## Consequences

- O desenvolvedor não terá problemas em rodar o sistema local, pois criamos um `.env.example` robusto simulando o que o Secret Manager e o Cloud Run fariam em produção.
- Todos os frameworks TS/Python usarão bibliotecas de parsing estrito (`zod` em Node, `pydantic` em Python) durante a inicialização (Startup) do serviço. Se uma variável falhar no cast (Ex: uma porta como String inválida ou chave da API vazia), a inicialização do microserviço/agente dá um Crash fatal (`Fail Fast`), impedindo deploy defeituoso.
- Quaisquer configurações em `config/` que sofram update forçarão o pipeline de release e deploy de nova versão de containers.
