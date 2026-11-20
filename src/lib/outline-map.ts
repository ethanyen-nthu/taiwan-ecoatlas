import type { L } from "@/content/lesson-index";

/** Simplified county outlines (public/data/county-outlines.json), keyed by the
 *  official county code. A drawing aid only: it never decides which county a
 *  record belongs to. */
export type OutlineFile = Record<
  string,
  { name: string; en: string; rings: [number, number][][] }
>;

export type DotKind = "self" | "same" | "other";
export interface MapDot {
  id: string;
  lon: number;
  lat: number;
  kind: DotKind;
  label: L;
  href?: string;
}
export interface OutlineMapData {
  width: number;
  height: number;
  /** Dot radius in drawing units. */
  radius: number;
  shapes: {
    code: string;
    d: string;
    focus: boolean;
  }[];
  dots: {
    id: string;
    x: number;
    y: number;
    kind: DotKind;
    label: L;
    href?: string;
  }[];
}
export interface OutlineMapOptions {
  dots: MapDot[];
  /** Counties drawn in the strong tone. */
  focus?: string[];
  /** Also fit the view to these counties, so a whole county stays in frame. */
  fitCounties?: string[];
  width?: number;
  maxHeight?: number;
  /** Padding around the fitted box, in degrees. */
  pad?: number;
  /** Smallest view, in degrees of latitude, so a lone point does not zoom in. */
  minSpan?: number;
}

type Box = [number, number, number, number];

function boxOf(rings: [number, number][][]): Box {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return [x0, y0, x1, y1];
}

/** The point inside a county that is farthest from every edge: a good place
 *  for a label. Coarse grid first, then a finer one around the best cell.
 *  Rings use the even-odd rule, so a ring inside another is a hole. */
export function labelSpot(
  rings: [number, number][][],
): { x: number; y: number; r: number } | null {
  const [x0, y0, x1, y1] = boxOf(rings);
  const inside = (x: number, y: number) => {
    let odd = false;
    for (const ring of rings)
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i],
          [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
          odd = !odd;
      }
    return odd;
  };
  const edge = (x: number, y: number) => {
    let best = Infinity;
    for (const ring of rings)
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, ay] = ring[j],
          [bx, by] = ring[i];
        const dx = bx - ax,
          dy = by - ay,
          len = dx * dx + dy * dy;
        const t = len
          ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len))
          : 0;
        const ex = ax + t * dx - x,
          ey = ay + t * dy - y;
        best = Math.min(best, ex * ex + ey * ey);
      }
    return Math.sqrt(best);
  };
  let best: { x: number; y: number; r: number } | null = null;
  const scan = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    steps: number,
  ) => {
    for (let i = 0; i < steps; i += 1)
      for (let j = 0; j < steps; j += 1) {
        const x = ax + ((bx - ax) * (i + 0.5)) / steps,
          y = ay + ((by - ay) * (j + 0.5)) / steps;
        if (!inside(x, y)) continue;
        const r = edge(x, y);
        if (!best || r > best.r) best = { x, y, r };
      }
  };
  scan(x0, y0, x1, y1, 22);
  if (best) {
    const { x, y } = best as { x: number; y: number };
    const step = Math.max(x1 - x0, y1 - y0) / 22;
    scan(x - step, y - step, x + step, y + step, 9);
  }
  const found = best as { x: number; y: number; r: number } | null;
  return found
    ? {
        x: Math.round(found.x * 10) / 10,
        y: Math.round(found.y * 10) / 10,
        r: Math.round(found.r * 10) / 10,
      }
    : null;
}

/** Project longitude/latitude to a flat drawing with the right aspect for
 *  Taiwan's latitude, fit it to the dots (and any named counties) and return
 *  paths and dot positions ready to render as SVG. */
export function buildOutlineMap(
  outlines: OutlineFile,
  options: OutlineMapOptions,
): OutlineMapData {
  const {
    dots,
    focus = [],
    fitCounties = [],
    width = 360,
    maxHeight = 520,
    pad = 0.1,
    minSpan = 0.5,
  } = options;
  const boxes: Box[] = dots.length
    ? [
        [
          Math.min(...dots.map((d) => d.lon)),
          Math.min(...dots.map((d) => d.lat)),
          Math.max(...dots.map((d) => d.lon)),
          Math.max(...dots.map((d) => d.lat)),
        ],
      ]
    : [];
  for (const code of fitCounties)
    if (outlines[code]) boxes.push(boxOf(outlines[code].rings));
  if (!boxes.length) boxes.push([119.9, 21.8, 122.1, 25.4]);
  let [x0, y0, x1, y1] = [
    Math.min(...boxes.map((b) => b[0])) - pad,
    Math.min(...boxes.map((b) => b[1])) - pad,
    Math.max(...boxes.map((b) => b[2])) + pad,
    Math.max(...boxes.map((b) => b[3])) + pad,
  ];
  const midLat = (y0 + y1) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  if (y1 - y0 < minSpan) {
    const grow = (minSpan - (y1 - y0)) / 2;
    y0 -= grow;
    y1 += grow;
  }
  if ((x1 - x0) * k < minSpan) {
    const grow = (minSpan / k - (x1 - x0)) / 2;
    x0 -= grow;
    x1 += grow;
  }
  const spanX = (x1 - x0) * k,
    spanY = y1 - y0;
  const scale = Math.min(width / spanX, maxHeight / spanY);
  const w = Math.round(spanX * scale),
    h = Math.round(spanY * scale);
  const px = (lon: number) => Math.round((lon - x0) * k * scale * 10) / 10,
    py = (lat: number) => Math.round((y1 - lat) * scale * 10) / 10;
  const shapes: OutlineMapData["shapes"] = [];
  for (const [code, county] of Object.entries(outlines)) {
    const [bx0, by0, bx1, by1] = boxOf(county.rings);
    if (bx1 < x0 || bx0 > x1 || by1 < y0 || by0 > y1) continue;
    const rings = county.rings.map((ring) =>
      ring.map(([lon, lat]) => [px(lon), py(lat)] as [number, number]),
    );
    const d = rings
      .map((ring) => `M${ring.map(([x, y]) => `${x} ${y}`).join("L")}Z`)
      .join("");
    shapes.push({
      code,
      d,
      focus: focus.includes(code),
    });
  }
  return {
    width: w,
    height: h,
    radius: Math.max(2.6, Math.min(5, w / 90)),
    shapes,
    dots: dots.map((dot) => ({
      id: dot.id,
      x: px(dot.lon),
      y: py(dot.lat),
      kind: dot.kind,
      label: dot.label,
      href: dot.href,
    })),
  };
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180,
    dLat = (b[1] - a[1]) * rad,
    dLon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
