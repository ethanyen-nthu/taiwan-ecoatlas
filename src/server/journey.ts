import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { islandFrame, islandPoint } from "@/lib/island-path";

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
  /** 10 km grid squares with roadkill records, binned by how many. */
  cells: string[];
  cellCount: number;
  offshoreCells: number;
}
interface PointCollection {
  features: {
    geometry: { type: string; coordinates: [number, number] };
  }[];
}
const root = path.join(process.cwd(), "public/data/atlas");
const read = async (file: string) =>
  JSON.parse(await readFile(path.join(root, file), "utf8")) as PointCollection;
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
    const [villages, parks, wildlife] = await Promise.all([
      read("villages.geojson"),
      read("taipei-parks.geojson"),
      read("wildlife.geojson"),
    ]);
    const counts = new Map<string, number>();
    for (const feature of wildlife.features) {
      const key = feature.geometry.coordinates.join(",");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const bins: string[][] = [[], [], [], []];
    let offshoreCells = 0,
      cellCount = 0;
    // A 10 km square is about 0.09° of longitude and latitude at this latitude.
    const halfLon = 0.045,
      halfLat = 0.045;
    for (const [key, count] of counts) {
      const [lon, lat] = key.split(",").map(Number);
      if (!inside(lon, lat)) {
        offshoreCells += 1;
        continue;
      }
      cellCount += 1;
      const [x0, y0] = islandPoint(lon - halfLon, lat + halfLat);
      const [x1, y1] = islandPoint(lon + halfLon, lat - halfLat);
      const bin = count >= 80 ? 3 : count >= 20 ? 2 : count >= 5 ? 1 : 0;
      bins[bin].push(
        `M${fixed(x0)} ${fixed(y0)}h${fixed(x1 - x0)}v${fixed(y1 - y0)}h${fixed(x0 - x1)}z`,
      );
    }
    return {
      villages: dots(villages.features.map((f) => f.geometry.coordinates)),
      parks: dots(
        parks.features
          .filter((f) => f.geometry.type === "Point")
          .map((f) => f.geometry.coordinates),
      ),
      cells: bins.map((list) => list.join("")),
      cellCount,
      offshoreCells,
    };
  })();
  return cache;
}
