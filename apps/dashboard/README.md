# BirtHub 360 Dashboard

This is the main user interface for the BirthHub 360 RevOps ecosystem.

## Stack
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + Radix UI (via `shadcn/ui` eventually)
- **Data:** `apps/api` as the single backend for auth, tenant resolution and dashboard data
- **State:** App Router + secure same-origin session cookies proxied to `apps/api`

## Getting Started

1. Make sure the shared API and database are migrated:
   ```bash
   pnpm --filter @birthub/database db:migrate:deploy
   ```

2. Run the primary API and then the dashboard:
   ```bash
   pnpm --filter @birthub/api dev
   pnpm dev
   ```

## Security model
- Dashboard authentication is delegated to `apps/api`; local dashboard passwords and JWT secrets are not supported.
- Tenant context comes only from the authenticated API session.
- Dashboard proxy routes forward session cookies to `apps/api` and never authorize via `x-tenant-id`.

## Key Features (Planned)
- [ ] **LDR:** Lead scoring and enrichment view.
- [ ] **SDR:** Deal pipeline and meeting scheduler.
- [ ] **AE:** Proposal generator and ROI calculator.
- [ ] **CS:** Customer health score board.
- [ ] **Finance:** MRR and cashflow analytics.
