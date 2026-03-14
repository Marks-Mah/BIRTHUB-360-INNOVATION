import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BillingRepository {
  async getSummary(tenantId: string): Promise<any> {
    const summary = await prisma.$queryRaw`
      SELECT
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM "Invoice"
      WHERE "tenantId" = ${tenantId}
      GROUP BY status
    `;
    return summary;
  }
}
