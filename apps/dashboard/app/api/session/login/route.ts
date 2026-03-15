import { NextResponse } from "next/server";

import { SESSION_COOKIE, getSessionToken } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { password?: string };
  const expectedPassword = process.env.DASHBOARD_PASSWORD?.trim();

  if (!expectedPassword) {
    return NextResponse.json(
      { ok: false, error: "DASHBOARD_PASSWORD is not configured" },
      { status: 503 }
    );
  }

  if (!payload.password || payload.password !== expectedPassword) {
    return NextResponse.json({ ok: false, error: "Credenciais invalidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, getSessionToken(), {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
