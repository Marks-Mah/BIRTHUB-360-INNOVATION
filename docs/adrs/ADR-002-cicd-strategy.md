# ADR-002: Estratégia de CI/CD e Proteção de Branch

## Estratégia
Utilizaremos **GitHub Actions** para todas as pipelines de CI/CD.

## Proteção da Branch
- A branch `main` possui bloqueio estrito.
- É obrigatória a passagem em todos os status checks antes de qualquer merge.
