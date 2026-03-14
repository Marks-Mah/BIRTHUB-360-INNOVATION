import type { NextApiRequest } from "next";
import { jwtVerify } from "jose";

export async function requireApiAuth(req: NextApiRequest): Promise<{ tenantId: string }> {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("missing_authorization");

  const secret = new TextEncoder().encode(process.env.DASHBOARD_JWT_SECRET || "dashboard-dev-secret");
  const { payload } = await jwtVerify(token, secret);
  const tenantId = String(req.headers["x-tenant-id"] || payload.tenantId || "default");
  return { tenantId };
}

export async function proxyJson(path: string, reqBody: unknown, tenantId: string) {
  const backend = process.env.API_URL || "http://localhost:3000";
  const response = await fetch(`${backend}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
    body: JSON.stringify(reqBody),
  });
  if (!response.ok) throw new Error(`backend_error_${response.status}`);
  return response.json();
}
