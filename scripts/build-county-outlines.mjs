// Builds public/data/county-outlines.json: the official NLSC county boundaries,
// simplified for small SVG maps (village and people profile pages).
//
//   node scripts/build-county-outlines.mjs
//
// The full-resolution archive (public/data/counties.geojson, ~8 MB) stays the
// source for the interactive map; this file is only a drawing aid and is never
// used to decide which county a record belongs to.
import { readFile, writeFile } from "node:fs/promises";

const TOLERANCE = 0.0018; // degrees, about 200 m
const MIN_SPAN = 0.012; // drop rings smaller than this (islets, about 1.3 km)

function distance(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Iterative Douglas-Peucker so very long rings cannot overflow the stack.
function simplify(points) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop();
    let worst = 0,
      index = -1;
    for (let i = from + 1; i < to; i += 1) {
      const d = distance(points[i], points[from], points[to]);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > TOLERANCE && index > 0) {
      keep[index] = 1;
      stack.push([from, index], [index, to]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n) => Math.round(n * 1000) / 1000;
const source = JSON.parse(
  await readFile("public/data/counties.geojson", "utf8"),
);
const out = {};
let before = 0,
  after = 0;
for (const feature of source.features) {
  const {
    COUNTYCODE: code,
    COUNTYNAME: name,
    COUNTYENG: en,
  } = feature.properties;
  const polygons =
    feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates];
  const rings = [];
  for (const polygon of polygons) {
    // Outer ring only: holes are enclaves too small to matter at this scale.
    const ring = polygon[0];
    before += ring.length;
    const xs = ring.map((p) => p[0]),
      ys = ring.map((p) => p[1]);
    const span = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );
    if (span < MIN_SPAN) continue;
    const reduced = simplify(ring);
    if (reduced.length < 4) continue;
    after += reduced.length;
    rings.push(reduced.map(([x, y]) => [round(x), round(y)]));
  }
  out[code] = { name, en, rings };
}
await writeFile("public/data/county-outlines.json", JSON.stringify(out));
console.log(
  `county-outlines.json: ${Object.keys(out).length} counties, ${before} -> ${after} points`,
);
