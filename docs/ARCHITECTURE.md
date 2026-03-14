# Matriz de Responsabilidades de Apps

O repositório é segmentado em diferentes aplicações, cada uma com sua responsabilidade estrita:

- **`apps/web` (Next.js):** Responsável por renderizar a UI (Server-Side Rendering / Client-Side Rendering). Comunica-se exclusivamente com a API.
- **`apps/api` (Node.js/Express/Fastify):** Realiza operações CRUD síncronas, regras de negócios imediatas e autenticação. Acesso direto ao Prisma Client.
- **`apps/worker` (Node.js background):** Responsável pelo processamento de LLMs, execução de filas assíncronas (Redis/BullMQ) e operações custosas (como faturamento).
