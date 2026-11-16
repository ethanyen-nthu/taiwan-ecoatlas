import { NextRequest, NextResponse } from "next/server";
import { atlasCollection } from "@/server/atlas";
import { queryAtlas, type AtlasFilters } from "@/lib/atlas-query";
import { sampleDate } from "@/lib/river";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams,
    ids = [
      ...new Set((params.get("layers") || "").split(",").filter(Boolean)),
    ].slice(0, 12);
  const bbox = params.get("bbox")?.split(",").map(Number);
  if (
    bbox &&
    (params
      .get("bbox")!
      .split(",")
      .some((value) => !value.trim()) ||
      bbox.length !== 4 ||
      bbox.some((n) => !Number.isFinite(n)) ||
      bbox[0] < -180 ||
      bbox[2] > 180 ||
      bbox[1] < -90 ||
      bbox[3] > 90 ||
      bbox[0] >= bbox[2] ||
      bbox[1] >= bbox[3])
  )
    return NextResponse.json({ error: "Invalid viewport" }, { status: 400 });
  const filter: AtlasFilters = {
    county: params.get("county") || undefined,
    bbox: bbox as AtlasFilters["bbox"],
  };
  const start = params.get("start") || undefined,
    end = params.get("end") || undefined;
  if (
    (filter.county && !/^\d{5}$/.test(filter.county)) ||
    [start, end].some((value) => value && sampleDate(value) !== value) ||
    (start && end && start > end)
  )
    return NextResponse.json({ error: "Invalid map filters" }, { status: 400 });
  filter.q = params.get("q")?.slice(0, 120) || undefined;
  filter.category = params.get("category")?.slice(0, 160) || undefined;
  const errors: string[] = [];
  const layers = await Promise.all(
    ids.map(async (id) => {
      try {
        const loaded = await atlasCollection(id);
        if (!loaded) {
          errors.push(id);
          return null;
        }
        if (["not-configured", "unavailable"].includes(loaded.status))
          errors.push(id);
        // Apply source record dates only where dates exist. Undated cultural
        // references and park inventories must survive historical filtering.
        const temporal =
          loaded.dataset.dateRange !== null ||
          loaded.dataset.id === "river-quality";
        const layerFilter = {
          ...filter,
          ...(temporal ? { start, end } : {}),
          ...(loaded.dataset.section === "wildlife"
            ? { species: params.get("species")?.slice(0, 160) || undefined }
            : {}),
        };
        const result = queryAtlas(
          loaded.dataset,
          loaded.collection,
          layerFilter,
        );
        return {
          // Do not leave a classification image visible outside its year.
          dataset:
            result.dataset.raster && (start || end) && result.total === 0
              ? { ...result.dataset, raster: undefined }
              : result.dataset,
          collection: result.collection,
          total: result.total,
          categories: result.categories,
          status: loaded.status,
        };
      } catch {
        errors.push(id);
        return null;
      }
    }),
  );
  return NextResponse.json(
    { layers: layers.filter(Boolean), errors },
    { headers: { "Cache-Control": "no-store" } },
  );
}
