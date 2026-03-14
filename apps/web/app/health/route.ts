import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    service: "web",
    status: "ok"
  });
}
