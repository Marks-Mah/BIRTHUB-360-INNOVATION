import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [invalidDeals, invalidCustomers, overduePaidInvoices] = await Promise.all([
    prisma.deal.count({ where: { OR: [{ probability: { lt: 0 } }, { probability: { gt: 100 } }] } }),
    prisma.customer.count({ where: { OR: [{ healthScore: { lt: 0 } }, { healthScore: { gt: 100 } }] } }),
    prisma.invoice.count({ where: { status: "PAID", paidAt: null } }),
  ]);

  const violations = [
    ["deal_probability", invalidDeals],
    ["customer_health_score", invalidCustomers],
    ["paid_without_date", overduePaidInvoices],
  ] as const;

  const hasViolations = violations.some(([, count]) => count > 0);

  console.table(violations.map(([name, count]) => ({ check: name, count })));

  if (hasViolations) {
    process.exitCode = 1;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
