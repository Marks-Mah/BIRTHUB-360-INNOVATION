# Métricas de Test Coverage

- **Baseline Global Mínimo:** A cobertura de código (statements) deve ser de no mínimo **80%**.
- **Regiões Críticas:** Utilitários de permissões e segurança (`auth`, `permissions`) exigem **100%** de cobertura.
- PRs que reduzam a cobertura global abaixo destes limites terão bloqueio no CI.
