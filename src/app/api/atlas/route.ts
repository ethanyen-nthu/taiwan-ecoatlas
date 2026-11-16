import { NextResponse } from "next/server";
import { atlasCatalogue } from "@/server/atlas";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json(await atlasCatalogue(), {
    headers: { "Cache-Control": "public, s-maxage=3600" },
  });
}
