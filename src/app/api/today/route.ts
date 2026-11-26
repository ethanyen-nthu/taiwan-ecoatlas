import { NextResponse } from "next/server";
import { todaySummary } from "@/server/today";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** A few numbers (air, temperature, rain, reservoirs) for the strip at the top
 *  of each page. Small enough to fetch on every page; shared by the CDN for two
 *  minutes because the feeds underneath change far more slowly than that. */
export async function GET() {
  return NextResponse.json(await todaySummary(), {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}
