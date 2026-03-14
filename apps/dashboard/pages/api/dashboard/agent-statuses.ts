import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiAuth } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tenantId } = await requireApiAuth(req);
    const backend = process.env.API_URL || "http://localhost:3000";
    const response = await fetch(`${backend}/api/v1/dashboard/agent-statuses?tenantId=${tenantId}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`backend_error_${response.status}`);
    return res.status(200).json(await response.json());
  } catch (error) {
    return res.status(502).json({ error: "proxy_failed", detail: String(error) });
  }
}
