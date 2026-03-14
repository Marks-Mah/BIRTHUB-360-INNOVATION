import { runWithTenantContext } from "@birthub/database";
import { runWithLogContext } from "@birthub/logger";

export async function executeTenantJob<T>(input: {
  requestId: string;
  tenantId: string;
  userId: string | null;
}, handler: () => Promise<T>): Promise<T> {
  return runWithLogContext(
    {
      requestId: input.requestId,
      tenantId: input.tenantId,
      userId: input.userId
    },
    () =>
      runWithTenantContext(
        {
          source: "system",
          tenantId: input.tenantId,
          userId: input.userId
        },
        handler
      )
  );
}
