import type { Choropleth } from "./choropleth";
import { subjectRamps } from "./choropleth";
import { labelSpot, type OutlineFile } from "./outline-map";

/** A number to hang inside one county on the map. `r` is the radius, in
 *  degrees, of the open space around the spot, so the page can hide the number
 *  while the county is still too small on screen to hold it. */
export interface CountyLabel {
  code: string;
  lng: number;
  lat: number;
  r: number;
  text: string;
  /** An island group with no neighbour to crowd it: its number is always shown,
   *  even while the islands are only a few pixels wide. */
  alone: boolean;
}

/** Penghu, Kinmen and Lienchiang (Matsu) lie far from every other county. */
export const offshoreCounties = ["10016", "09020", "09007"];

/** The fill for every county that has records. A county with none is left out
 *  so the map draws it as plain land. With fewer than three counties the
 *  classes would only suggest a pattern, so they all share the middle step. */
export function countyTints(
  rows: { code: string; count: number }[],
  choropleth: Choropleth | null,
): Record<string, string> {
  const tints: Record<string, string> = {};
  for (const row of rows)
    if (row.count > 0)
      tints[row.code] = choropleth?.tint[row.code] ?? subjectRamps.wildlife[2];
  return tints;
}

const SCALE = 1000;
/** Taiwan's mean latitude: a degree of longitude is this much shorter than a
 *  degree of latitude, so shapes are squeezed the same way before measuring. */
const SQUEEZE = Math.cos((24 * Math.PI) / 180);

/** For each county, the point farthest from its border (so the number sits in
 *  the middle of the largest island, not on a coast) and how much room it has. */
export function countyLabelSpots(
  outlines: OutlineFile,
): Record<string, { lng: number; lat: number; r: number }> {
  const spots: Record<string, { lng: number; lat: number; r: number }> = {};
  for (const [code, county] of Object.entries(outlines)) {
    const spot = labelSpot(
      county.rings.map((ring) =>
        ring.map(
          ([lng, lat]) =>
            [lng * SQUEEZE * SCALE, lat * SCALE] as [number, number],
        ),
      ),
    );
    if (!spot) continue;
    spots[code] = {
      lng: spot.x / (SCALE * SQUEEZE),
      lat: spot.y / SCALE,
      r: spot.r / SCALE,
    };
  }
  return spots;
}

/** One label per county that has records. */
export function countyLabels(
  rows: { code: string; count: number }[],
  spots: Record<string, { lng: number; lat: number; r: number }> | null,
  format: (value: number) => string,
): CountyLabel[] {
  if (!spots) return [];
  const labels: CountyLabel[] = [];
  for (const row of rows) {
    const spot = spots[row.code];
    if (row.count > 0 && spot)
      labels.push({
        code: row.code,
        ...spot,
        text: format(row.count),
        alone: offshoreCounties.includes(row.code),
      });
  }
  return labels;
}

/** Width in pixels of a printed number (11 px figures plus the pill's padding). */
export function labelWidth(text: string): number {
  return text.length * 6.8 + 14;
}
