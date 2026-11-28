import { NextResponse } from "next/server";
import { hazardService } from "@/server/hazards";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Felt earthquakes and tropical cyclone tracks from the Central Weather
 *  Administration. The server keeps one copy for every visitor, so the CDN only
 *  needs to hold it for a minute. This is a map of what the agency has
 *  published, never a warning service. */
export async function GET() {
  return NextResponse.json(await hazardService.get(), {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
