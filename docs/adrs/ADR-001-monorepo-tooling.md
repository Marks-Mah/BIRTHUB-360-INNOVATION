# ADR-001: Escolha do Monorepo Tooling (Turborepo vs Nx)

## Contexto
O BirthHub360 é composto por múltiplas aplicações (Web, API, Worker) e pacotes compartilhados (config, database, logger, etc.). Precisamos de uma ferramenta de monorepo que gerencie as dependências, orquestre scripts de build/dev de forma eficiente e otimize o tempo de CI.

## Opções Consideradas
- **Turborepo:** Focado em velocidade e simplicidade, cache remoto excelente, integração nativa com Next.js (Vercel).
- **Nx:** Muito poderoso e extensível, com geração de código, porém pode ser complexo e overkill para nossa necessidade inicial.
- **Lerna:** Ferramenta legada, não suporta cache avançado ou execução de tarefas paralelizadas de forma tão eficiente quanto Turbo ou Nx.

## Decisão
Optamos por utilizar o **Turborepo** como nossa ferramenta de monorepo.

## Consequências
- Facilidade de configuração e integração perfeita com Next.js (que usamos para o app Web).
- Cache remoto permite acelerar as pipelines de CI e builds locais.
- A curva de aprendizado é menor, permitindo um onboarding mais rápido dos desenvolvedores.
