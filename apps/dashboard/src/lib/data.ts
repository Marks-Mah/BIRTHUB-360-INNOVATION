import { prisma } from "@birthub/database";
import { unstable_noStore as noStore } from "next/cache";

export async function getDashboardStats() {
  noStore();
  try {
    const [leadsCount, dealsCount, customersCount, mrr] = await Promise.all([
      prisma.lead.count(),
      prisma.deal.count(),
      prisma.customer.count(),
      prisma.customer.aggregate({
        _sum: {
          mrr: true,
        },
      }),
    ]);

    const recentActivity = await prisma.agentLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    return {
      leadsCount,
      dealsCount,
      customersCount,
      mrr: mrr._sum.mrr || 0,
      recentActivity,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch dashboard data.");
  }
}

export async function getDealsByStage() {
  noStore();
  try {
    const deals = await prisma.deal.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        lead: {
          select: {
            name: true,
            company: true,
          },
        },
      },
    });
    return deals;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch deals.");
  }
}


export async function getFinancialMetrics() {
  noStore();
  try {
    const [mrr, churnCount, overdueInvoices] = await Promise.all([
      prisma.customer.aggregate({ _sum: { mrr: true } }),
      prisma.customer.count({ where: { healthStatus: "churning" } }),
      prisma.invoice.findMany({
        where: { status: "OVERDUE" },
        take: 5,
        include: { customer: { include: { organization: true } } },
      }),
    ]);

    // Calculate cashflow (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenue = await prisma.invoice.groupBy({
      by: ["createdAt"],
      where: {
        status: "PAID",
        createdAt: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
    });

    return {
      mrr: mrr._sum.mrr || 0,
      churnCount,
      overdueInvoices,
      revenueHistory: revenue.map(r => ({
        date: r.createdAt.toISOString().slice(0, 7), // YYYY-MM
        amount: r._sum.amount || 0
      }))
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch financial data.");
  }
}

export async function getAnalyticsMetrics() {
  noStore();
  try {
    const leadsBySource = await prisma.lead.groupBy({
      by: ["source"],
      _count: true,
    });

    const dealsWon = await prisma.deal.count({ where: { stage: "CLOSED_WON" } });
    const dealsLost = await prisma.deal.count({ where: { stage: "CLOSED_LOST" } });
    const totalClosed = dealsWon + dealsLost;
    const winRate = totalClosed > 0 ? (dealsWon / totalClosed) * 100 : 0;

    return {
      leadsBySource: leadsBySource.map(s => ({ source: s.source || "Direct", count: s._count })),
      winRate,
      dealsWon,
      dealsLost
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch analytics data.");
  }
}

export async function getContracts() {
  noStore();
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        deal: {
          include: {
            lead: { select: { company: true } }
          }
        }
      }
    });
    return contracts;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch contracts.");
  }
}

export async function getAgentLogs() {
  noStore();
  try {
    const logs = await prisma.agentLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return logs;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch agent logs.");
  }
}

export async function getCustomersWithHealth() {
  noStore();
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { healthScore: "asc" }, // Show risky customers first
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    });
    return customers;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch customers.");
  }
}
