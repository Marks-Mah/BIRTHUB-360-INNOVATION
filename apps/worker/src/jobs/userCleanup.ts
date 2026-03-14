import { UserStatus, prisma, type PrismaClient } from "@birthub/database";
import { createHash } from "node:crypto";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function cleanupSuspendedUsers(
  prismaClient: PrismaClient = prisma,
  now: Date = new Date()
): Promise<{ anonymized: number; inspected: number }> {
  const cutoff = new Date(now.getTime() - NINETY_DAYS_MS);
  const suspendedUsers = await prismaClient.user.findMany({
    where: {
      status: UserStatus.SUSPENDED,
      suspendedAt: {
        lte: cutoff
      }
    }
  });

  for (const user of suspendedUsers) {
    await prismaClient.user.update({
      data: {
        email: `deleted+${user.id}@redacted.local`,
        mfaEnabled: false,
        mfaSecret: null,
        name: "Deleted User",
        passwordHash: createHash("sha256")
          .update(`deleted:${user.id}:${now.toISOString()}`)
          .digest("hex")
      },
      where: {
        id: user.id
      }
    });
  }

  return {
    anonymized: suspendedUsers.length,
    inspected: suspendedUsers.length
  };
}
