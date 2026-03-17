# Arquitetura Canônica

## Decisões
- Frontend canônico: `apps/web`.
- API canônica: `apps/api`.
- Persistência canônica: `@birthub/database`.
- `api-gateway` fica como compat layer de transição.

## Fluxos oficiais
1. UI -> BFF (`apps/web/app/api/bff`) -> API.
2. API -> fila (`packages/queue`) -> worker.
3. Worker -> integrações via boundaries em `packages/integrations`.

## Legado explícito
- `apps/dashboard`: legado operacional.
- `packages/db`: compatibilidade temporária.
