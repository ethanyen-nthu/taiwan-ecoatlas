import type {
  AtlasCollection,
  AtlasFeature,
  AtlasSection,
} from "./atlas-types";
import { subjectRamps } from "./choropleth";

export interface TileClass {
  color: string;
  from: number;
  to: number;
  /** Tiles in this class. */
  n: number;
}
export interface TileKey {
  classes: TileClass[];
  /** Total number of tiles drawn. */
  tiles: number;
  /** Approximate tile edge in kilometres, for the key. */
  km: number;
  colorOf: (count: number) => string;
}

function quantile(sorted: number[], at: number) {
  const position = (sorted.length - 1) * at,
    low = Math.floor(position),
    high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Neutral steps for tiles drawn over county shading, so the two encodings
 *  never share a hue. */
const inkRamp = ["#c8d0d8", "#8695a6", "#4d6075", "#16202b"];

/** Group tile counts into at most four classes by quantile. Fewer classes are
 *  used when the counts hardly vary, so no class is ever empty. Light to dark
 *  follows the subject ramp, so lightness alone orders the classes. */
export function tileKey(
  features: AtlasFeature[],
  section: AtlasSection,
  neutral = false,
): TileKey | null {
  const counts = features
    .filter(
      (feature) =>
        feature.properties.aggregated && feature.properties.x0 != null,
    )
    .map((feature) => Number(feature.properties.count || 0))
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  if (!counts.length) return null;
  // Skip the palest step: small tiles are the commonest, and they must stay
  // visible against the light basemap.
  const ramp = neutral ? inkRamp : subjectRamps[section].slice(1);
  const top = counts[counts.length - 1];
  const cuts: number[] = [];
  for (let i = 1; i < ramp.length; i += 1) {
    const cut = Math.ceil(quantile(counts, i / ramp.length));
    if (cut < top && (!cuts.length || cut > cuts[cuts.length - 1]))
      cuts.push(cut);
  }
  const bounds = [...cuts, top];
  const colours = bounds.map((_, index) =>
    bounds.length === 1
      ? ramp[2]
      : ramp[Math.round((index * (ramp.length - 1)) / (bounds.length - 1))],
  );
  const classOf = (count: number) => {
    let index = 0;
    while (index < cuts.length && count > cuts[index]) index += 1;
    return index;
  };
  const classes = bounds.map<TileClass>((to, index) => ({
    color: colours[index],
    from: index === 0 ? counts[0] : bounds[index - 1] + 1,
    to,
    n: 0,
  }));
  for (const count of counts) classes[classOf(count)].n += 1;
  const km = Number(
    features.find((feature) => feature.properties.cellKm)?.properties.cellKm ||
      0,
  );
  return {
    classes: classes.filter((item) => item.n > 0),
    tiles: counts.length,
    km,
    colorOf: (count) => colours[classOf(count)],
  };
}

/** Replace each aggregated grid point with the tile it stands for (its
 *  `x0..y1` bounds). The centre point stays beside it, still flagged
 *  `aggregated`, so heat maps keep one weighted position per tile. */
export function tileCollection(
  data: AtlasCollection,
  section: AtlasSection,
  neutral = false,
): { data: AtlasCollection; key: TileKey | null } {
  const key = tileKey(data.features, section, neutral);
  if (!key) return { data, key };
  const features: AtlasFeature[] = [];
  for (const feature of data.features) {
    features.push(feature);
    const p = feature.properties;
    if (!p.aggregated || feature.geometry.type !== "Point" || p.x0 == null)
      continue;
    const [x0, y0, x1, y1] = [p.x0, p.y0, p.x1, p.y1].map(Number);
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
            [x0, y0],
          ],
        ],
      },
      properties: {
        ...p,
        tile: true,
        tileColor: key.colorOf(Number(p.count || 0)),
      },
    });
  }
  return { data: { ...data, features }, key };
}
