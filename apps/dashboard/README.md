# BirtHub 360 Dashboard

This is the main user interface for the BirtHub 360 RevOps ecosystem.

## Stack
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + Radix UI (via `shadcn/ui` eventually)
- **Data:** Server Actions + Prisma ORM (`@birthub/db`)
- **State:** URL State + Server Components

## Getting Started

1. Make sure the database is migrated:
   ```bash
   pnpm db:migrate
   ```

2. Run the development server:
   ```bash
   pnpm dev
   ```

## Key Features (Planned)
- [ ] **LDR:** Lead scoring and enrichment view.
- [ ] **SDR:** Deal pipeline and meeting scheduler.
- [ ] **AE:** Proposal generator and ROI calculator.
- [ ] **CS:** Customer health score board.
- [ ] **Finance:** MRR and cashflow analytics.
