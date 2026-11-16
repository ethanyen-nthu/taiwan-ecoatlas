import { NextRequest, NextResponse } from "next/server";
import { atlasCollection } from "@/server/atlas";
import {
  csvExport,
  filterAtlas,
  queryAtlas,
  type AtlasFilters,
} from "@/lib/atlas-query";
import { sampleDate } from "@/lib/river";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dataset: string }> },
) {
  const { dataset: id } = await context.params;
  const search = request.nextUrl.searchParams;
  const filter: AtlasFilters = {
    county: search.get("county") || undefined,
    q: search.get("q")?.slice(0, 120),
    category: search.get("category") || undefined,
    species: search.get("species") || undefined,
    metric: search.get("metric") || undefined,
    start: search.get("start") || undefined,
    end: search.get("end") || undefined,
    period:
      search.get("period") === "year"
        ? "year"
        : search.get("period") === "day"
          ? "day"
          : "month",
    offset: Number(search.get("offset") || 0),
    limit: Math.min(100, Number(search.get("limit") || 40)),
  };
  if (
    (filter.county && !/^\d{5}$/.test(filter.county)) ||
    [filter.start, filter.end].some(
      (value) => value && sampleDate(value) !== value,
    ) ||
    (filter.start && filter.end && filter.start > filter.end) ||
    !Number.isInteger(filter.offset) ||
    filter.offset! < 0 ||
    !Number.isInteger(filter.limit) ||
    filter.limit! < 1
  )
    return NextResponse.json(
      { error: "Invalid dataset filters" },
      { status: 400 },
    );
  if (search.has("bbox")) {
    const parts = search.get("bbox")!.split(","),
      box = parts.map(Number);
    if (
      parts.some((value) => !value.trim()) ||
      box.length !== 4 ||
      box.some((value) => !Number.isFinite(value)) ||
      box[0] < -180 ||
      box[2] > 180 ||
      box[1] < -90 ||
      box[3] > 90 ||
      box[0] >= box[2] ||
      box[1] >= box[3]
    )
      return NextResponse.json({ error: "Invalid bbox" }, { status: 400 });
    filter.bbox = box as [number, number, number, number];
  }
  try {
    const loaded = await atlasCollection(id);
    if (!loaded)
      return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
    if (search.get("format") === "csv") {
      const records = filterAtlas(loaded.collection, filter).slice(0, 5000);
      return new NextResponse(csvExport(loaded.dataset, records), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${id}.csv"`,
          "Cache-Control": "no-store",
          "X-Export-Record-Limit": "5000",
        },
      });
    }
    return NextResponse.json(
      {
        ...queryAtlas(loaded.dataset, loaded.collection, filter),
        status: loaded.status,
        retrievedAt: loaded.retrievedAt,
        ...("sourceRows" in loaded ? { sourceRows: loaded.sourceRows } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Dataset unavailable. The source registry documents its coverage.",
      },
      { status: 503 },
    );
  }
}
