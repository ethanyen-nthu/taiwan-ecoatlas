import type { AtlasSection } from "./atlas-types";
import { aqiTintForValue } from "./transform";

/** Five-step sequential ramps: one hue per subject, light to dark. Lightness
 *  alone separates the classes, so the map still reads without colour vision. */
export const subjectRamps: Record<AtlasSection, string[]> = {
  environment: ["#d6e9f5", "#9cc8e3", "#5aa3cc", "#1a7cb0", "#0a4d74"],
  urban: ["#d3efed", "#8fd0cc", "#44a9a6", "#0a8685", "#075658"],
  forests: ["#e1eedb", "#b3d6a4", "#7fb56d", "#4b853e", "#28541f"],
  wildlife: ["#f7e4c2", "#ecc27a", "#d79b32", "#a06a08", "#653f06"],
  culture: ["#f6ddd5", "#e8b3a3", "#d08469", "#ae5843", "#74311f"],
};

export interface ChoroplethRow {
  code: string;
  /** Measurement mean, or null when the county has no measured value. */
  value: number | null;
  count: number;
}
export interface ChoroplethClass {
  color: string;
  from: number;
  to: number;
  /** Counties in this class. */
  n: number;
}
export interface Choropleth {
  /** County code to fill colour. Counties without data are left out. */
  tint: Record<string, string>;
  classes: ChoroplethClass[];
  /** True when the shading shows a measurement rather than record counts. */
  measured: boolean;
  /** True when the colours are the official AQI bands. */
  official: boolean;
  missing: number;
}

function quantileBreaks(sorted: number[], classes: number) {
  const breaks: number[] = [];
  for (let i = 1; i < classes; i += 1) {
    const at = (sorted.length - 1) * (i / classes);
    const low = Math.floor(at);
    const high = Math.ceil(at);
    breaks.push(sorted[low] + (sorted[high] - sorted[low]) * (at - low));
  }
  return breaks;
}

/** Shade counties by a measurement mean, or by record count when the dataset
 *  has no chosen measurement. Returns null when fewer than three counties have
 *  a value, because a ramp over two counties would only look like a pattern. */
export function buildChoropleth(
  rows: ChoroplethRow[],
  section: AtlasSection,
  options: { aqi?: boolean } = {},
): Choropleth | null {
  const measured = rows.some((row) => row.value !== null);
  const valueOf = (row: ChoroplethRow) => (measured ? row.value : row.count);
  const withValue = rows.filter((row) => {
    const value = valueOf(row);
    return value !== null && Number.isFinite(value) && (measured || value > 0);
  });
  if (withValue.length < 3) return null;
  const missing = rows.length - withValue.length;
  const tint: Record<string, string> = {};
  if (options.aqi && measured) {
    for (const row of withValue) tint[row.code] = aqiTintForValue(row.value!);
    return { tint, classes: [], measured: true, official: true, missing };
  }
  const values = withValue.map((row) => valueOf(row)!).sort((a, b) => a - b);
  const ramp = subjectRamps[section];
  const cuts = quantileBreaks(values, ramp.length);
  const classOf = (value: number) => {
    let index = 0;
    while (index < cuts.length && value > cuts[index]) index += 1;
    return index;
  };
  const classes: ChoroplethClass[] = ramp.map((color) => ({
    color,
    from: Infinity,
    to: -Infinity,
    n: 0,
  }));
  for (const row of withValue) {
    const value = valueOf(row)!;
    const index = classOf(value);
    tint[row.code] = ramp[index];
    classes[index].from = Math.min(classes[index].from, value);
    classes[index].to = Math.max(classes[index].to, value);
    classes[index].n += 1;
  }
  return {
    tint,
    classes: classes.filter((item) => item.n > 0),
    measured,
    official: false,
    missing,
  };
}
