# ADR-008: Estratégia e Frameworks de Teste

## Decisão
- **Test Runner:** Vitest (maior velocidade em monorepos, substitui o Jest).
- **Integração HTTP:** Supertest.
- **Frontend UI:** React Testing Library (RTL).
A pirâmide de testes prioriza testes unitários e de integração rápidos, com E2E sendo mais seletivos (Smoke tests).
