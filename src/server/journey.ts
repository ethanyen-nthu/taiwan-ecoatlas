import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildChoropleth, subjectRamps } from "@/lib/choropleth";
import { islandFrame, islandPoint } from "@/lib/island-path";
import type { OutlineFile } from "@/lib/outline-map";

/**
 * Marks drawn on the home page's pinned island, built from the published data
 * files and sent as short SVG path strings. Everything is on the same 160 × 300
 * frame as the island outline.
 */
export interface JourneyMarks {
  /** One point per village; draw as round-capped zero-length lines. */
  villages: string;
  /** One point per Taipei park. */
  parks: string;
  /** County shapes with roadkill records, one path string per shade step of
   *  the wildlife ramp, lightest first. */
  counties: string[];
  /** Records from counties that sit outside the island's frame. */
  offshoreRecords: number;
}
interface PointCollection {
  features: {
    geometry: { type: string; coordinates: [number, number] };
  }[];
}
const root = path.join(process.cwd(), "public/data/atlas");
const read = async (file: string) =>
  JSON.parse(await readFile(path.join(root, file), "utf8")) as PointCollection;
const readJson = async <T>(file: string) =>
  JSON.parse(await readFile(file, "utf8")) as T;
const fixed = (n: number) => Number(n.toFixed(1));
const inside = (lon: number, lat: number) =>
  lon >= islandFrame.west - 0.1 &&
  lon <= islandFrame.east + 0.1 &&
  lat >= islandFrame.south - 0.1 &&
  lat <= islandFrame.north + 0.1;

function dots(points: [number, number][]) {
  return points
    .filter(([lon, lat]) => inside(lon, lat))
    .map(([lon, lat]) => {
      const [x, y] = islandPoint(lon, lat);
      return `M${fixed(x)} ${fixed(y)}h0`;
    })
    .join("");
}

let cache: Promise<JourneyMarks> | null = null;
export function journeyMarks() {
  cache ??= (async () => {
    const [villages, parks, species, outlines] = await Promise.all([
      read("villages.geojson"),
      read("taipei-parks.geojson"),
      readJson<{ species: { countyCounts: Record<string, number> }[] }>(
        path.join(root, "wildlife.species.json"),
      ),
      readJson<OutlineFile>(
        path.join(process.cwd(), "public/data/county-outlines.json"),
      ),
    ]);
    const totals = new Map<string, number>();
    for (const item of species.species)
      for (const [code, count] of Object.entries(item.countyCounts))
        totals.set(code, (totals.get(code) || 0) + count);
    // Same classes as the wildlife page's county map, so the two always agree.
    const ramp = subjectRamps.wildlife;
    const shading = buildChoropleth(
      [...totals].map(([code, count]) => ({ code, value: null, count })),
      "wildlife",
    );
    const steps: string[][] = ramp.map(() => []);
    let offshoreRecords = 0;
    for (const [code, county] of Object.entries(outlines)) {
      const step = shading ? ramp.indexOf(shading.tint[code]) : -1;
      if (step < 0) continue;
      // A county with a distant islet keeps its island and leaves the islet out.
      const rings = county.rings.filter((ring) =>
        ring.every(([lon, lat]) => inside(lon, lat)),
      );
      if (!rings.length) {
        offshoreRecords += totals.get(code) || 0;
        continue;
      }
      steps[step].push(
        rings
          .map(
            (ring) =>
              `M${ring
                .map(([lon, lat]) => {
                  const [x, y] = islandPoint(lon, lat);
                  return `${fixed(x)} ${fixed(y)}`;
                })
                .join("L")}Z`,
          )
          .join(""),
      );
    }
    return {
      villages: dots(villages.features.map((f) => f.geometry.coordinates)),
      parks: dots(
        parks.features
          .filter((f) => f.geometry.type === "Point")
          .map((f) => f.geometry.coordinates),
      ),
      counties: steps.map((list) => list.join("")),
      offshoreRecords,
    };
  })();
  return cache;
}
