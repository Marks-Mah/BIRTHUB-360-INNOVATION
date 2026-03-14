# OPERATIONS.md

## Ciclo de Seguranca no Release

Este checklist e obrigatorio antes de criar a tag `v1.0` (ou qualquer release de producao):

1. Atualizar dependencias Node para versoes suportadas:
   `pnpm up -r --latest`
2. Reinstalar e validar lockfile:
   `pnpm install --frozen-lockfile=false`
3. Rodar auditoria de producao e zerar `high`/`critical`:
   `pnpm audit --prod`
4. Rodar testes de regressao:
   `pnpm --filter @birthub/api test`
   `pnpm --filter @birthub/worker test`
   `pnpm --filter @birthub/web test`
5. Validar scans de seguranca do repositorio:
   `pnpm security:report`
   `pnpm security:guards`
6. Validar segredos e politicas de branch:
   workflow `security-scan.yml` verde
   workflow `ci.yml` verde

## Frequencia Recomendada

- Diario: monitorar alertas de seguranca e SLO.
- Semanal: `pnpm audit --prod` e revisao de dependencias.
- A cada release: executar checklist completo acima.

## Criterio de Go/No-Go

- `Go`: sem vulnerabilidades `high`/`critical` em producao e suites de teste verdes.
- `No-Go`: qualquer alerta `critical`, `high` pendente ou regressao funcional sem mitigacao aprovada.
