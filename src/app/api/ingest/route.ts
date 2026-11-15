import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { observationService } from "@/server/observations";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Ingestion not configured" },
      { status: 503 },
    );
  const expected = Buffer.from(`Bearer ${secret}`),
    actual = Buffer.from(request.headers.get("authorization") || "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await Promise.all([
    observationService.get("aqi"),
    observationService.get("weather"),
  ]);
  const ok = results.every((r) => r.status === "fresh");
  return NextResponse.json(
    {
      ok,
      results: results.map((r) => ({
        source: r.source,
        status: r.status,
        retrievedAt: r.retrievedAt,
        count: r.observations.length,
      })),
    },
    { status: ok ? 200 : 503 },
  );
}
