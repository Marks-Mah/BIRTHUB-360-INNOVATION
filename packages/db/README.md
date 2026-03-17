# @birthub/db (DEPRECATED)

Status: frozen legacy compatibility package.
Owner: Platform Architecture.
Freeze date: 2026-03-17.

Canonical Prisma client and repositories live in `@birthub/database`.

Hard rules:
- Do not add new migrations under `packages/db/prisma/migrations`.
- Do not add new runtime imports of `@birthub/db`.
- Do not add new domain models here.
- Keep this package read-only until final removal.

Planned removal:
- Target window: after runtime consolidation in Stage 7.
