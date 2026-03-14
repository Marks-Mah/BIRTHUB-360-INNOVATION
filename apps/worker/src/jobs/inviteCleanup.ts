import { prisma } from "@birthub/database";

export async function inviteCleanupJob() {
  return prisma.invite.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}
