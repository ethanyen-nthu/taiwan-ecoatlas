import type { OutlineFile } from "./outline-map";

/**
 * Plain map drawings of the 22 counties, for the coloured maps. The outlines
 * in public/data/county-outlines.json are a drawing aid only; they never
 * decide which county a figure belongs to (the county code does).
 */
export interface CountyShape {
  code: string;
  /** SVG path data in the set's own units. */
  d: string;
  /** The smallest box that holds every ring: left, top, right, bottom. */
  box: [number, number, number, number];
}
export interface ShapeSet {
  width: number;
  height: number;
  shapes: CountyShape[];
}

/** The part of the world the maps show: Taiwan, Penghu, Kinmen and Matsu.
 *  Far-off islets that some counties own (Pratas, Taiping, Diaoyutai) fall
 *  outside it and are left off. */
export const shapeFrame = {
  west: 118.1,
  east: 122.2,
  south: 21.8,
  north: 26.5,
} as const;

/** Units per degree of latitude. */
const unitsPerDegree = 200;
/** East-west degrees are shorter than north-south ones at this latitude. */
const squeeze = Math.cos((24 * Math.PI) / 180);

export function countyShapes(outlines: OutlineFile): ShapeSet {
  const { west, east, south, north } = shapeFrame;
  const width = Math.round((east - west) * unitsPerDegree * squeeze);
  const height = Math.round((north - south) * unitsPerDegree);
  const project = ([lon, lat]: [number, number]) => [
    Math.round((lon - west) * unitsPerDegree * squeeze),
    Math.round((north - lat) * unitsPerDegree),
  ];
  const inside = ([lon, lat]: [number, number]) =>
    lon >= west && lon <= east && lat >= south && lat <= north;

  const shapes = Object.entries(outlines).map(([code, county]) => {
    const parts: string[] = [];
    let area = 0;
    let box: [number, number, number, number] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity,
    ];
    for (const ring of county.rings) {
      if (ring.length < 3 || !inside(ring[0])) continue;
      const points: number[][] = [];
      for (const point of ring) {
        const [x, y] = project(point);
        const last = points[points.length - 1];
        if (!last || last[0] !== x || last[1] !== y) points.push([x, y]);
      }
      if (points.length < 3) continue;
      let twice = 0;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        twice += points[j][0] * points[i][1] - points[i][0] * points[j][1];
      }
      area += Math.abs(twice) / 2;
      for (const [x, y] of points) {
        box = [
          Math.min(box[0], x),
          Math.min(box[1], y),
          Math.max(box[2], x),
          Math.max(box[3], y),
        ];
      }
      parts.push(`M${points.map((p) => `${p[0]} ${p[1]}`).join("L")}Z`);
    }
    return { code, d: parts.join(""), area, box };
  });
  // Big counties first, so the small ones inside or beside them sit on top.
  shapes.sort((a, b) => b.area - a.area || a.code.localeCompare(b.code));
  return {
    width,
    height,
    shapes: shapes
      .filter((shape) => shape.d !== "")
      .map(({ code, d, box }) => ({ code, d, box })),
  };
}

export type MapScale = {
  /** Upper edges of every class but the last, lowest first. */
  breaks: number[];
  /** One colour per class: breaks.length + 1 of them. */
  colors: string[];
};

/** Which class a value falls in: the first whose upper edge it is below. */
export function classOf(value: number, scale: MapScale): number {
  const index = scale.breaks.findIndex((edge) => value < edge);
  return index === -1 ? scale.breaks.length : index;
}
