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
  shapes: { code: string; d: string; focus: boolean }[];
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
    const d = county.rings
      .map(
        (ring) =>
          `M${ring.map(([lon, lat]) => `${px(lon)} ${py(lat)}`).join("L")}Z`,
      )
      .join("");
    shapes.push({ code, d, focus: focus.includes(code) });
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
