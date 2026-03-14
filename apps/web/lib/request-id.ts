import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

export async function getServerRequestId(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("bh_request_id")?.value ?? randomUUID();
}
