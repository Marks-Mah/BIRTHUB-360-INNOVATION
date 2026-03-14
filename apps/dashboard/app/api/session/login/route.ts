import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionToken } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { password?: string };

  const expectedPassword = process.env.DASHBOARD_PASSWORD ?? "birthub360";
  if (!payload.password || payload.password !== expectedPassword) {
    return NextResponse.json({ ok: false, error: "Credenciais inválidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, getSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
