import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type CoverageCheck = {
  file: string;
  id: string;
  label: string;
  patterns: RegExp[];
};

const checks: CoverageCheck[] = [
  {
    file: "apps/api/tests/billing.checkout.test.ts",
    id: "7.9.C2",
    label: "Checkout cobre locale/country + automatic_tax",
    patterns: [/automatic_tax/, /proration_behavior/, /locale/i]
  },
  {
    file: "apps/api/tests/billing.ip-ban.test.ts",
    id: "7.9.C4",
    label: "Checkout aplica banimento temporario por IP",
    patterns: [/isCheckoutIpTemporarilyBanned/, /registerCheckoutDecline/, /clearCheckoutIpBan/]
  },
  {
    file: "apps/worker/src/jobs/billingExport.ts",
    id: "7.9.C1",
    label: "Export noturno consolida invoices e envia via adapter",
    patterns: [/exportDailyBillingInvoices/, /uploadJson/, /resolveBillingExportWindow/]
  },
  {
    file: "apps/api/src/modules/webhooks/stripe.router.ts",
    id: "7.9.C3",
    label: "Downgrade/proration cria credito idempotente",
    patterns: [/createDowngradeProrationCredit/, /DOWNGRADE_PRORATION/, /customer\.subscription\.updated/]
  },
  {
    file: "apps/api/tests/billing.proration-credit.test.ts",
    id: "7.9.C3:test",
    label: "Teste cobre replay idempotente do credito de proration",
    patterns: [/billingCreditCreates/, /customer\.subscription\.updated/, /amountCents: 10000/]
  },
  {
    file: "apps/api/tests/billing.paywall.test.ts",
    id: "7.10.C1:guards",
    label: "Guard de billing/paywall segue coberto",
    patterns: [/RequireFeature/, /402/, /Payment Required/]
  },
  {
    file: "tests/e2e/billing-premium.spec.ts",
    id: "7.10.C3",
    label: "E2E cobre pricing -> paid plan -> workflow/node visible",
    patterns: [/\/pricing/, /\/workflows\/demo\/edit/, /Workflow Runs - demo/]
  }
];

const threshold = 100;
const root = process.cwd();
const results = checks.map((check) => {
  const absolutePath = resolve(root, check.file);
  const content = readFileSync(absolutePath, "utf8");
  const covered = check.patterns.every((pattern) => pattern.test(content));

  return {
    ...check,
    covered
  };
});
const coveredCount = results.filter((result) => result.covered).length;
const coveragePercent = Math.round((coveredCount / results.length) * 100);
const summary = {
  coveredCount,
  coveragePercent,
  generatedAt: new Date().toISOString(),
  results,
  threshold
};
const jsonPath = resolve(root, "test-results/billing-coverage.json");
const markdownPath = resolve(root, "docs/evidence/billing-coverage.md");
const markdown = `# Billing Coverage Report

- Generated at: ${summary.generatedAt}
- Coverage: ${summary.coveragePercent}%
- Threshold: ${summary.threshold}%

${results
  .map((result) => `- ${result.id} ${result.covered ? "PASS" : "FAIL"} - ${result.label} (${result.file})`)
  .join("\n")}
`;

mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
writeFileSync(markdownPath, markdown, "utf8");

if (coveragePercent < threshold) {
  throw new Error(
    `Billing coverage threshold not met: ${coveragePercent}% < ${threshold}%`
  );
}
