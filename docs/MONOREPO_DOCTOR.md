# Monorepo Doctor

Comando: `pnpm monorepo:doctor`

## Verificações críticas
- imports legados `@birthub/db`
- artefatos gerados versionados (`.tsbuildinfo`, `.js` gerado com `.ts` par)
- colisão de portas em scripts `dev`

## Relatório
- saída em `artifacts/doctor/monorepo-doctor-report.md`
