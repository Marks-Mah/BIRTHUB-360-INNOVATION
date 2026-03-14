# ADR-004: Gestão Estrita de Variáveis de Ambiente

## Decisão
Utilizamos **Zod** para a validação (schema validation) de variáveis de ambiente no momento de inicialização da aplicação.
Isso garante o princípio de **fail-fast**, impedindo que a aplicação suba sem configurações vitais ou com configurações mal formatadas.
