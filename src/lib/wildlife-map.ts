import type { Choropleth } from "./choropleth";
import { subjectRamps } from "./choropleth";
import {
  buildOutlineMap,
  type OutlineFile,
  type OutlineMapData,
} from "./outline-map";

/** Counties that lie outside the frame of the main island: Penghu, Kinmen and
 *  Lienchiang (Matsu). They are listed beside the map instead of being
 *  squeezed into it, so the island can be drawn large. */
export const offshoreCounties = ["10016", "09020", "09007"] as const;

/** Corners of the main island (with a little sea), in longitude and latitude. */
const islandCorners = [
  { lon: 120.0, lat: 21.85 },
  { lon: 122.05, lat: 25.35 },
];

/** The main island and the counties on it, drawn flat from the simplified
 *  outlines, with a label spot inside each county. */
export function buildIslandMap(
  outlines: OutlineFile,
  width = 360,
  maxHeight = 620,
): OutlineMapData {
  return buildOutlineMap(outlines, {
    dots: islandCorners.map((corner, index) => ({
      id: `corner-${index}`,
      lon: corner.lon,
      lat: corner.lat,
      kind: "other" as const,
      label: { en: "", zh: "" },
    })),
    width,
    maxHeight,
    pad: 0.02,
    compact: true,
  });
}

export interface CountyFill {
  fill: string;
  /** 0 is the lightest step. */
  step: number;
  /** Which text colour stays readable on this fill. */
  ink: "dark" | "light";
}

/** Fill for every county that has records. A county with none is left out so
 *  the map can draw it as plain land. With fewer than three counties the
 *  classes would only suggest a pattern, so they all share the middle step. */
export function countyFills(
  rows: { code: string; count: number }[],
  choropleth: Choropleth | null,
): Record<string, CountyFill> {
  const ramp = subjectRamps.wildlife;
  const fills: Record<string, CountyFill> = {};
  for (const row of rows) {
    if (!(row.count > 0)) continue;
    const fill = choropleth?.tint[row.code] ?? ramp[2];
    const step = Math.max(0, ramp.indexOf(fill));
    fills[row.code] = { fill, step, ink: step >= 3 ? "light" : "dark" };
  }
  return fills;
}

/** Whether a number fits inside the open space of a county. */
export function labelFits(text: string, radius: number): boolean {
  return radius * 2 >= text.length * 6.6 + 2;
}
