# Billing Coverage Report

- Generated at: 2026-03-17T03:32:39.113Z
- Coverage: 100%
- Threshold: 100%

- 7.9.C2 PASS - Checkout cobre locale/country + automatic_tax (apps/api/tests/billing.checkout.test.ts)
- 7.9.C4 PASS - Checkout aplica banimento temporario por IP (apps/api/tests/billing.ip-ban.test.ts)
- 7.9.C1 PASS - Export noturno consolida invoices e envia via adapter (apps/worker/src/jobs/billingExport.ts)
- 7.9.C3 PASS - Downgrade/proration cria credito idempotente (apps/api/src/modules/webhooks/stripe.router.ts)
- 7.9.C3:test PASS - Teste cobre replay idempotente do credito de proration (apps/api/tests/billing.proration-credit.test.ts)
- 7.10.C1:guards PASS - Guard de billing/paywall segue coberto (apps/api/tests/billing.paywall.test.ts)
- 7.10.C3 PASS - E2E cobre pricing -> paid plan -> workflow/node visible (tests/e2e/billing-premium.spec.ts)
