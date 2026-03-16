# Matriz de Responsabilidades de Apps

O repositório é segmentado em diferentes aplicações, cada uma com sua responsabilidade estrita:

- **`apps/web` (Next.js):** Responsável por renderizar a UI (Server-Side Rendering / Client-Side Rendering). Comunica-se exclusivamente com a API.
- **`apps/api` (Node.js/Express/Fastify):** Realiza operações CRUD síncronas, regras de negócios imediatas e autenticação. Acesso direto ao Prisma Client.
- **`apps/worker` (Node.js background):** Responsável pelo processamento de LLMs, execução de filas assíncronas (Redis/BullMQ) e operações custosas (como faturamento).
- **`packages/agents-core` + `packages/workflows-core`:** Contratos canônicos de agentes, catálogos, handoffs, steps de workflow, conectores e política de execução.
- **`apps/api-gateway` + `apps/agent-orchestrator` + serviços Python:** Trilha legada mantida como ponte de migração; novas features devem priorizar `apps/api` e `apps/worker`.

Para o mapa operacional do stack canônico, conectores, bootstrap e readiness, consulte `docs/canonical-stack-connectors.md`.
