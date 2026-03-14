# Análise de Risco de Supply Chain no BirthHub 360

O ataque moderno de Supply Chain foca em explorar bibliotecas (NPM/PyPI), containers Docker base ou scripts de integração contínua e, a partir delas, invadir as empresas que as consomem. Com a junção do ecossistema TypeScript e Python no monorepo do **BirthHub 360**, nossa superfície de pacotes externos cresce vertiginosamente.

## Matriz de Riscos de Dependências

### 1. Ecossistema Node.js / TypeScript (NPM/pnpm)

**Riscos Identificados:**

- O pacote `express` e middlewares adjacentes. Se comprometidos, o invasor intercepta _todos_ os requests, injetando payloads e roubando Auth JWTs no próprio `api-gateway`.
- Pacotes utilitários de menor porte (ex: formatadores de strings ou date) criados por desenvolvedores solo. Eles frequentemente sofrem ataques de _Typosquatting_ (nomes similares como `react-routr` vs `react-router`) ou _Account Takeover_ (o desenvolvedor abandona e outro o assume pondo malware no próximo patch).

**Políticas de Mitigação (NPM):**

- **Lockfile Estrito:** Jamais faça um `pnpm install` que regenere o `pnpm-lock.yaml` arbitrariamente sem o PR listar as exatas versões modificadas. Em produção, usamos `pnpm install --frozen-lockfile`.
- **Auditoria de Dependências:** Processos automatizados do GitHub (`Dependabot`) varrem diariamente o repositório acusando pacotes com falhas graves em seus hashes/arquivos. Nesses casos o PR "Bump version" deve ser aceito como prioridade P1.

### 2. Ecossistema Python (PyPI / FastAPI / LangChain)

**Riscos Identificados:**

- As bibliotecas atreladas à arquitetura de IA (`langchain`, `langgraph`, `openai-python`) sofrem atualizações diárias/semanais. Frequentemente o ecossistema de Data/AI do Python atrai pacotes opacos de "Analytics". Se um pacote desses executar um "telemetry logger" enviando env vars para fora, as chaves mestras e até dados financeiros são vazados.
- Bibliotecas fundamentais como `fastapi`, `pydantic` ou conectores `psycopg` com eventuais CVEs não patcheadas viram vetores abertos.

**Políticas de Mitigação (Python):**

- Utilização apenas de pacotes de repositórios oficiais via gerenciadores que geram "hashes" criptográficos determinísticos de dependência (`pip-compile`, `poetry` ou similar no `requirements.txt`).
- Evitar instalar pacotes `0.x.x` de autores desconhecidos para fazer Parse de prompts a não ser que o Tech Lead valide o source code inteiro. O agente só executa `Tools` codificadas pelo time interno, com bibliotecas seguras e estáveis.

### 3. CI/CD e Imagens Base Docker (Third-Party Providers)

**Riscos Identificados:**

- O uso de uma imagem base Docker pública, como `node:20-alpine` ou `python:3.12-slim` comprometida.
- Actions do GitHub Marketplace (`uses: actions/checkout@v4`) puxadas de repositórios obscuros que podem injetar backdoors enquanto o nosso CI gera o container de Produção.

**Políticas de Mitigação:**

- Para Imagens Base Docker: Focar no uso das imagens **Oficiais** suportadas. Atualizar as Tags das imagens (ex: mudar de `node:20.10.0` para `node:20.12.0`) apenas durante janelas programadas, nunca deixando as tags "flutuantes" como `FROM node:latest`.
- Para GitHub Actions: Aceitar "Actions" não oficiais apenas com auditoria profunda, fazendo pin diretamente no hash SHA do commit ao invés da versão (`@v1`), prevenindo que o autor altere o script rodando sob a mesma versão (ex: `@hash4821817478`).
