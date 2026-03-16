import type { NextApiRequest, NextApiResponse } from "next";
import { proxyJson } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return res.status(200).json(await proxyJson("/api/v1/dashboard/agent-statuses", req));
  } catch (error) {
    return res.status(502).json({ error: "proxy_failed", detail: String(error) });
  }
}
