import { NextRequest, NextResponse } from "next/server";
import { observationService } from "@/server/observations";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kind: string }> },
) {
  const { kind } = await context.params;
  if (kind !== "aqi" && kind !== "weather")
    return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
  const bboxText = request.nextUrl.searchParams.get("bbox");
  let bbox: number[] | undefined;
  if (bboxText !== null) {
    bbox = bboxText.split(",").map(Number);
    if (
      bboxText.split(",").some((v) => !v.trim()) ||
      bbox.length !== 4 ||
      bbox.some((n) => !Number.isFinite(n)) ||
      bbox[0] < -180 ||
      bbox[2] > 180 ||
      bbox[1] < -90 ||
      bbox[3] > 90 ||
      bbox[0] >= bbox[2] ||
      bbox[1] >= bbox[3]
    )
      return NextResponse.json(
        { error: "Expected bbox=west,south,east,north" },
        { status: 400 },
      );
  }
  const result = await observationService.get(kind);
  const observations = bbox
    ? result.observations.filter(
        (o) =>
          o.longitude >= bbox![0] &&
          o.longitude <= bbox![2] &&
          o.latitude >= bbox![1] &&
          o.latitude <= bbox![3],
      )
    : result.observations;
  return NextResponse.json(
    { ...result, observations },
    { headers: { "Cache-Control": "no-store" } },
  );
}
