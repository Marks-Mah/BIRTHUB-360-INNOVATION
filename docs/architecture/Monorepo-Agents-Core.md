# Separation of Concerns: Monorepo Agents Core

**Decisão de Arquitetura:**
Como definido no planejamento do Ciclo 4 (4.1.J4), decidimos isolar completamente a lógica do motor de agentes no pacote `@birthub/agents-core` (anteriormente referido como `@repo/agents-core`).

## Princípios Adotados
*   **Agnóstico a Banco de Dados:** O pacote `agents-core` **não conhece** Prisma, PostgreSQL ou Redis. Ele depende de Interfaces e Tipos genéricos (como os definidos em `packages/agents-core/src/types/index.ts`).
*   **Agnóstico a Transporte (HTTP/gRPC):** O `agents-core` processa requisições baseadas em abstrações de Input e Output. O pacote não utiliza Express, NestJS ou similares. Todo parse HTTP de rotas web deve ocorrer em gateways e apps acima da stack.
*   **Apenas I/O Puro e LLM:** O pacote implementa Parsing estrito (Zod), a Policy Engine (`Default-Deny`) e os Tool Execution Frameworks para se comunicar estritamente via injeção de dependências com provedores de LLMs.

Esta separação impede a degradação e vazamento de regras de negócios de infraestrutura e protege o motor contra vulnerabilidades diretas de injeção de banco de dados ou redes expostas.