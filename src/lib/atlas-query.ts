import type {
  AtlasCollection,
  AtlasDataset,
  AtlasFeature,
  AtlasResult,
} from "./atlas-types";
import { findSpeciesInfo } from "../content/species-info";

/** Snap the aggregation cell size to 0.8° halved k times. The grid then stays
 *  put while the person pans, so tiles do not reshuffle on every map move. */
export function gridStep(raw: number) {
  const k = Math.max(0, Math.round(Math.log2(0.8 / Math.max(raw, 1e-6))));
  return 0.8 / 2 ** k;
}

export interface AtlasFilters {
  county?: string;
  start?: string;
  end?: string;
  q?: string;
  category?: string;
  species?: string;
  metric?: string;
  period?: "month" | "year" | "day";
  bbox?: [number, number, number, number];
  offset?: number;
  limit?: number;
}
const geometryBounds = new WeakMap<object, [number, number, number, number]>();
function bounds(feature: AtlasFeature) {
  const cached = geometryBounds.get(feature.geometry);
  if (cached) return cached;
  const box: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];
  function visit(value: unknown) {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      box[0] = Math.min(box[0], value[0]);
      box[1] = Math.min(box[1], value[1]);
      box[2] = Math.max(box[2], value[0]);
      box[3] = Math.max(box[3], value[1]);
    } else value.forEach(visit);
  }
  visit(feature.geometry.coordinates);
  geometryBounds.set(feature.geometry, box);
  return box;
}
export function featureDay(feature: AtlasFeature) {
  const date = feature.properties.date;
  if (!date) return null;
  if (/^\d{4}$/.test(date)) return date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const time = Date.parse(date);
  return Number.isFinite(time)
    ? new Date(time + 8 * 3600_000).toISOString().slice(0, 10)
    : null;
}
function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}
function measured(feature: AtlasFeature, metric?: string) {
  if (metric === "windDirection") return null;
  const value = metric ? feature.properties[metric] : null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function filterAtlas(collection: AtlasCollection, filter: AtlasFilters) {
  const text = filter.q?.trim().toLowerCase();
  return collection.features.filter((feature) => {
    const p = feature.properties,
      day = featureDay(feature),
      names = findSpeciesInfo(
        typeof p.scientificName === "string" ? p.scientificName : null,
      );
    const start = day?.length === 4 ? filter.start?.slice(0, 4) : filter.start,
      end = day?.length === 4 ? filter.end?.slice(0, 4) : filter.end;
    return (
      (!filter.county ||
        p.countyCode === filter.county ||
        String(p.intersectingCountyCodes || "")
          .split(",")
          .includes(filter.county)) &&
      (!filter.category || p.category === filter.category) &&
      (!filter.species ||
        p.speciesId === filter.species ||
        p.species === filter.species) &&
      (!start || (!!day && day >= start)) &&
      (!end || (!!day && day <= end)) &&
      (!text ||
        [
          p.title,
          p.titleZh,
          p.species,
          p.scientificName,
          names?.zh,
          names?.en,
          names?.aka,
          p.group,
          p.river,
          p.basin,
          p.id,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(text),
        ))
    );
  });
}
export function queryAtlas(
  dataset: AtlasDataset,
  collection: AtlasCollection,
  filter: AtlasFilters = {},
): AtlasResult {
  const filtered = filterAtlas(collection, filter);
  const categoryMap = new Map<string, number>(),
    speciesMap = new Map<string, { id: string; name: string; count: number }>();
  const counties = new Map<string, { count: number; values: number[] }>(),
    timeline = new Map<string, { count: number; values: number[] }>();
  let earliest: string | null = null,
    latest: string | null = null;
  for (const feature of filtered) {
    const p = feature.properties,
      date = featureDay(feature),
      value = measured(feature, filter.metric);
    if (p.category)
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
    if (p.speciesId || p.species) {
      const id = String(p.speciesId || p.species),
        species = speciesMap.get(id) || {
          id,
          name: String(p.species || p.scientificName || id),
          count: 0,
        };
      species.count++;
      speciesMap.set(id, species);
    }
    if (p.countyCode) {
      const county = counties.get(p.countyCode) || { count: 0, values: [] };
      county.count++;
      if (value !== null) county.values.push(value);
      counties.set(p.countyCode, county);
    }
    if (date) {
      if (!earliest || date < earliest) earliest = date;
      if (!latest || date > latest) latest = date;
      const period = date.slice(
          0,
          filter.period === "year" ? 4 : filter.period === "day" ? 10 : 7,
        ),
        item = timeline.get(period) || { count: 0, values: [] };
      item.count++;
      if (value !== null) item.values.push(value);
      timeline.set(period, item);
    }
  }
  const visible = filter.bbox
    ? filtered.filter((feature) => {
        const box = bounds(feature),
          view = filter.bbox!;
        return (
          box[2] >= view[0] &&
          box[0] <= view[2] &&
          box[3] >= view[1] &&
          box[1] <= view[3]
        );
      })
    : filtered;
  const points = visible.filter((feature) => feature.geometry.type === "Point"),
    shapes = visible.filter((feature) => feature.geometry.type !== "Point");
  const unique = new Set(
    points.map((feature) => feature.geometry.coordinates.join(",")),
  ).size;
  const view = filter.bbox || [117.8, 21.7, 122.2, 26.6],
    step =
      unique > 3000
        ? gridStep(Math.max(view[2] - view[0], view[3] - view[1]) / 45)
        : 0;
  type Label = {
    t: string;
    z: string | null;
    id: string;
    n: number;
    e?: string;
    s?: string;
  };
  const groups = new Map<
    string,
    {
      first: AtlasFeature;
      count: number;
      x: number;
      y: number;
      ix: number;
      iy: number;
      labels: Map<string, Label>;
    }
  >();
  for (const feature of points) {
    if (feature.geometry.type !== "Point") continue;
    const [x, y] = feature.geometry.coordinates,
      grid = feature.properties.gridId,
      // Records published against a coarse grid cell belong together even
      // when their stored coordinates differ in the fifth decimal.
      key = step
        ? `${Math.floor(x / step)}:${Math.floor(y / step)}`
        : typeof grid === "string"
          ? `g:${grid}`
          : `${x}:${y}`;
    const group = groups.get(key) || {
      first: feature,
      count: 0,
      x: 0,
      y: 0,
      ix: step ? Math.floor(x / step) : 0,
      iy: step ? Math.floor(y / step) : 0,
      labels: new Map<string, Label>(),
    };
    group.count++;
    group.x += x;
    group.y += y;
    if (!step) {
      const name = String(
        feature.properties.species || feature.properties.title,
      );
      const info = findSpeciesInfo(
        String(feature.properties.scientificName || name),
      );
      const label: Label = group.labels.get(name) || {
        t: name,
        z: feature.properties.titleZh || info?.zh || null,
        id: feature.properties.id,
        n: 0,
        ...(info?.en ? { e: info.en } : {}),
        ...(feature.properties.speciesId
          ? { s: String(feature.properties.speciesId) }
          : {}),
      };
      label.n++;
      group.labels.set(name, label);
    }
    groups.set(key, group);
  }
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  const mapFeatures: AtlasFeature[] = [
    ...shapes.slice(0, 3000),
    ...[...groups.entries()].map(([key, group]): AtlasFeature => {
      if (group.count === 1) return group.first;
      const cx = group.x / group.count,
        cy = group.y / group.count,
        radius = Number(group.first.properties.generalizationRadiusM);
      // Where a position is published as a coarse cell, draw the cell itself;
      // a dot would claim a precision the source deliberately withholds.
      let bounds: Record<string, number | boolean> = {};
      if (step) {
        bounds = {
          x0: round(group.ix * step),
          y0: round(group.iy * step),
          x1: round((group.ix + 1) * step),
          y1: round((group.iy + 1) * step),
          cellKm: Math.round(step * 111),
          split: true,
        };
      } else if (Number.isFinite(radius) && radius > 0) {
        const side = radius * Math.SQRT2,
          hy = side / 2 / 111000,
          hx = hy / Math.cos((cy * Math.PI) / 180);
        bounds = {
          x0: round(cx - hx),
          y0: round(cy - hy),
          x1: round(cx + hx),
          y1: round(cy + hy),
          cellKm: Math.round(side / 1000),
          split: false,
        };
      }
      const members = [...group.labels.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 8);
      return {
        type: "Feature",
        id: `cell:${key}`,
        geometry: { type: "Point", coordinates: [cx, cy] },
        properties: {
          id: `cell:${key}`,
          sourceId: dataset.sourceId,
          title: `${group.count.toLocaleString("en")} matching records`,
          titleZh: `${group.count.toLocaleString("zh-TW")} 筆符合資料`,
          countyCode: filter.county || null,
          date: null,
          category: null,
          count: group.count,
          aggregated: true,
          ...bounds,
          ...(members.length
            ? {
                members: JSON.stringify(members),
                memberKinds: group.labels.size,
              }
            : {}),
        },
      };
    }),
  ];
  const offset = filter.offset || 0,
    limit = filter.limit || 40;
  return {
    dataset:
      dataset.raster && (filter.start || filter.end) && filtered.length === 0
        ? { ...dataset, raster: undefined }
        : dataset,
    collection: { type: "FeatureCollection", features: mapFeatures },
    records: visible.slice(offset, offset + limit),
    total: filtered.length,
    inViewport: visible.length,
    aggregated: groups.size < points.length,
    nextOffset: offset + limit < visible.length ? offset + limit : null,
    categories: [...categoryMap]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    species: [...speciesMap.values()].sort((a, b) => b.count - a.count),
    counties: [...counties]
      .map(([code, item]) => ({
        code,
        count: item.count,
        value:
          item.values.length >= 2 || dataset.section === "forests"
            ? average(item.values)
            : null,
        measured: item.values.length,
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    timeline: [...timeline]
      .map(([period, item]) => ({
        period,
        count: item.count,
        value: average(item.values),
        measured: item.values.length,
      }))
      .sort((a, b) => a.period.localeCompare(b.period)),
    dateRange: earliest && latest ? [earliest, latest] : null,
  };
}
export function csvExport(dataset: AtlasDataset, records: AtlasFeature[]) {
  const fields = [
    "id",
    "title",
    "countyCode",
    "date",
    "sourceId",
    ...dataset.fields.map((field) => field.key),
  ];
  const keys = [...new Set(fields)];
  const cell = (value: unknown) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+@-]/.test(text) && typeof value !== "number")
      text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    keys.map(cell).join(","),
    ...records.map((feature) =>
      keys.map((key) => cell(feature.properties[key])).join(","),
    ),
  ].join("\r\n");
}
