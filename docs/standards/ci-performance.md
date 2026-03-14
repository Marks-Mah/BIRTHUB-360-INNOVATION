# SLA de Tempo de Execução do CI

- **SLA:** O CI não pode levar mais que 5 minutos para rodar as validações em PRs.
- **Estratégia:** Deve-se utilizar cache agressivo (via Turborepo e cache do gerenciador de pacotes - pnpm).
