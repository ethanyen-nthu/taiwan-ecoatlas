import { shapeFrame } from "./county-shapes";
import type { OutlineFile } from "./outline-map";

/** A county's own outline, drawn as large as a box allows, for the share
 *  image and the printed card. East-west degrees are shortened for the
 *  latitude, as on the atlas maps. */
export interface Silhouette {
  d: string;
  width: number;
  height: number;
}

const squeeze = Math.cos((24 * Math.PI) / 180);
/** Islands closer together than this (in degrees, about 75 km) are drawn as
 *  one group. Farther ones are left off the picture so the main group can be
 *  drawn large: Kinmen's own islands are about 20 km across and its Wuqiu
 *  islet lies 100 km away. The picture is a mark, not a map; every figure on
 *  the card still counts the whole county. */
export const groupGap = 0.7;

type Ring = [number, number][];
interface Box {
  west: number;
  east: number;
  south: number;
  north: number;
}
const boxOf = (ring: Ring): Box => {
  const lons = ring.map((point) => point[0]);
  const lats = ring.map((point) => point[1]);
  return {
    west: Math.min(...lons),
    east: Math.max(...lons),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };
};
/** The empty space between two boxes, in degrees; 0 when they touch. */
const gap = (a: Box, b: Box) =>
  Math.hypot(
    Math.max(0, a.west - b.east, b.west - a.east),
    Math.max(0, a.south - b.north, b.south - a.north),
  );
const area = (ring: Ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};

/** The largest group of islands, by area, of the rings inside the map frame. */
export function mainGroup(rings: Ring[]): Ring[] {
  const boxes = rings.map(boxOf);
  const group = rings.map((_, index) => index);
  const find = (index: number): number =>
    group[index] === index ? index : (group[index] = find(group[index]));
  for (let i = 0; i < rings.length; i += 1)
    for (let j = i + 1; j < rings.length; j += 1)
      if (gap(boxes[i], boxes[j]) <= groupGap) group[find(i)] = find(j);
  const weight = new Map<number, number>();
  rings.forEach((ring, index) => {
    const root = find(index);
    weight.set(root, (weight.get(root) ?? 0) + area(ring));
  });
  const [best] = [...weight.entries()].sort((a, b) => b[1] - a[1])[0];
  return rings.filter((_, index) => find(index) === best);
}

export function silhouette(
  county: OutlineFile[string],
  box: { width: number; height: number },
): Silhouette | null {
  const { west, east, south, north } = shapeFrame;
  // Far-off islets some counties own (Pratas, Taiping) lie outside the frame
  // of the county maps and are left off here too.
  const inFrame = county.rings.filter(
    (ring) =>
      ring.length >= 3 &&
      ring[0][0] >= west &&
      ring[0][0] <= east &&
      ring[0][1] >= south &&
      ring[0][1] <= north,
  );
  if (!inFrame.length) return null;
  const rings = mainGroup(inFrame);
  const lons = rings.flatMap((ring) => ring.map((point) => point[0]));
  const lats = rings.flatMap((ring) => ring.map((point) => point[1]));
  const minLon = Math.min(...lons);
  const maxLat = Math.max(...lats);
  const spanX = (Math.max(...lons) - minLon) * squeeze;
  const spanY = maxLat - Math.min(...lats);
  const scale = Math.min(box.width / spanX, box.height / spanY);
  const at = ([lon, lat]: [number, number]) =>
    `${((lon - minLon) * squeeze * scale).toFixed(1)} ${((maxLat - lat) * scale).toFixed(1)}`;
  return {
    d: rings.map((ring) => `M${ring.map(at).join("L")}Z`).join(""),
    width: Math.round(spanX * scale),
    height: Math.round(spanY * scale),
  };
}
