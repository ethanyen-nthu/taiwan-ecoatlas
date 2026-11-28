import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Polygon,
} from "geojson";
import {
  circleRing,
  intensityBand,
  intensityColours,
  quadrantRing,
  type Cyclone,
  type Earthquake,
  type Fix,
} from "./hazards";

/** Marker radius in pixels from magnitude: about 3 px at M2 up to 19 px at
 *  M7, and a small fixed dot where the report gives no magnitude. */
export function quakeRadius(magnitude: number | null) {
  if (magnitude === null) return 4;
  return Math.max(3, Math.min(22, 3 + (magnitude - 2) * 3.2));
}

export function quakeFeatures(events: Earthquake[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      id: undefined,
      geometry: {
        type: "Point",
        coordinates: [event.longitude, event.latitude],
      },
      properties: {
        id: event.id,
        radius: quakeRadius(event.magnitude),
        color: intensityColours[intensityBand(event.maxIntensity)],
      },
    })),
  };
}

export function cycloneFeatures(cyclones: Cyclone[]) {
  const tracks: Feature<LineString>[] = [];
  const areas: Feature<Polygon>[] = [];
  const fixes: Feature<Point>[] = [];
  for (const cyclone of cyclones) {
    const current = cyclone.current;
    const line = (kind: "past" | "forecast", points: Fix[]) =>
      points.length >= 2 &&
      tracks.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.longitude, p.latitude]),
        },
        properties: { kind, cyclone: cyclone.id },
      });
    line("past", cyclone.past);
    // The forecast line starts at the latest analysed position.
    line(
      "forecast",
      current ? [current, ...cyclone.forecast] : cyclone.forecast,
    );
    const point = (
      fix: Fix,
      kind: "past" | "current" | "forecast",
      at: number,
    ) =>
      fixes.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [fix.longitude, fix.latitude] },
        properties: { cyclone: cyclone.id, kind, at },
      });
    cyclone.past.forEach((fix, index) => {
      if (fix !== current) point(fix, "past", index);
    });
    cyclone.forecast.forEach((fix, index) => point(fix, "forecast", index));
    if (current) {
      point(current, "current", cyclone.past.length - 1);
      const ring = (kind: string, coordinates: [number, number][] | null) =>
        coordinates &&
        areas.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [coordinates] },
          properties: { kind, cyclone: cyclone.id },
        });
      if (current.radius15Quadrants)
        ring(
          "wind15",
          quadrantRing(
            current.longitude,
            current.latitude,
            current.radius15Quadrants,
          ),
        );
      else if (current.radius15)
        ring(
          "wind15",
          circleRing(current.longitude, current.latitude, current.radius15),
        );
      if (current.radius25)
        ring(
          "wind25",
          circleRing(current.longitude, current.latitude, current.radius25),
        );
    }
    for (const fix of cyclone.forecast)
      if (fix.radius70)
        areas.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              circleRing(fix.longitude, fix.latitude, fix.radius70, 48),
            ],
          },
          properties: { kind: "p70", cyclone: cyclone.id },
        });
  }
  return {
    tracks: {
      type: "FeatureCollection",
      features: tracks,
    } as FeatureCollection<LineString>,
    areas: {
      type: "FeatureCollection",
      features: areas,
    } as FeatureCollection<Polygon>,
    fixes: {
      type: "FeatureCollection",
      features: fixes,
    } as FeatureCollection<Point>,
  };
}
