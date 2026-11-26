import { NextResponse } from "next/server";
import { reservoirService } from "@/server/reservoirs";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await reservoirService.get(), {
    headers: { "Cache-Control": "no-store" },
  });
}
