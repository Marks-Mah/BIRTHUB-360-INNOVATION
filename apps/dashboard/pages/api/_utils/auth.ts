import type { NextApiRequest } from "next";
import { jwtVerify } from "jose";

export async function requireApiAuth(req: NextApiRequest): Promise<{ tenantId: string }> {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("missing_authorization");

  const dashboardJwtSecret = process.env.DASHBOARD_JWT_SECRET?.trim();
  if (!dashboardJwtSecret) {
    throw new Error("dashboard_jwt_secret_missing");
  }

  const secret = new TextEncoder().encode(dashboardJwtSecret);
  const { payload } = await jwtVerify(token, secret);
  const tenantId =
    typeof payload.tenantId === "string" && payload.tenantId.trim().length > 0
      ? payload.tenantId
      : null;

  if (!tenantId) {
    throw new Error("missing_tenant_claim");
  }

  return { tenantId };
}

export async function proxyJson(path: string, reqBody: unknown, authToken: string) {
  const backend = process.env.API_URL || "http://localhost:3000";
  const response = await fetch(`${backend}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reqBody),
  });
  if (!response.ok) throw new Error(`backend_error_${response.status}`);
  return response.json();
}
