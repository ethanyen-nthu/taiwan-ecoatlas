"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  GeoJSONSource,
  Map as LibreMap,
  MapLayerMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import { LocateFixed, TriangleAlert } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import type {
  Counties,
  Language,
  Observation,
  ObservationKind,
} from "@/lib/types";
import {
  boundsOfCoordinates,
  inCounty,
  ISLAND_BOUNDS,
  TAIWAN_BOUNDS,
} from "@/lib/geo";
import {
  aqiColor,
  aqiColours,
  aqiTintForValue,
  aqiStatusEnglish,
} from "@/lib/transform";
import { observationFreshness } from "@/lib/freshness";
import type { AtlasFeature, AtlasOverlay } from "@/lib/atlas-types";
import { tileCollection } from "@/lib/atlas-tiles";
import { subjectRamps } from "@/lib/choropleth";
import { labelWidth, type CountyLabel } from "@/lib/wildlife-map";
import type { HazardsResponse } from "@/lib/hazards";
import {
  hazardHitLayers,
  installHazardLayers,
  type HazardController,
  type HazardTarget,
} from "./hazard-layers";

interface Props {
  overlays?: AtlasOverlay[];
  onViewport?: (viewport: {
    bbox: [number, number, number, number];
    zoom: number;
  }) => void;
  onAtlasSelect?: (datasetId: string, feature: AtlasFeature) => void;
  focusedAtlas?: {
    datasetId: string;
    feature: AtlasFeature;
    /** False when the click came from the map itself, so the view stays put. */
    fly?: boolean;
  } | null;
  compact?: boolean;
  /** The page shows the selected record itself, so the map draws no popup. */
  externalInspector?: boolean;
  /** Frame the main island instead of all offshore islands (home preview). */
  island?: boolean;
  /** County code to fill colour: a choropleth drawn under the data layers. */
  countyTint?: Record<string, string> | null;
  /** A number printed inside each county, hidden while the county is too small
   *  on screen to hold it. Only the tint is drawn by the map itself. */
  countyLabels?: CountyLabel[];
  counties: Counties;
  selectedCounty: string;
  boundariesVisible: boolean;
  aqi: Observation[];
  weather: Observation[];
  aqiVisible: boolean;
  weatherVisible: boolean;
  /** Felt earthquakes and cyclone tracks; drawn only while their switch is on. */
  hazards?: HazardsResponse | null;
  quakesVisible?: boolean;
  typhoonVisible?: boolean;
  /** A report picked from the list; a new object each time, so choosing the
   *  same report again opens it again. */
  focusedHazard?: HazardTarget | null;
  language: Language;
  resetToken: number;
  onSelect: (code: string) => void;
  focusedObservation: {
    kind: ObservationKind;
    observation: Observation;
  } | null;
  onReady?: () => void;
  aqiRetrievedAt: string | null;
  weatherRetrievedAt: string | null;
}
const emptyPoints: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [],
};
const fallbackStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "ocean",
      type: "background",
      paint: { "background-color": "#e6eaee" },
    },
  ],
};
// Explicit asset URL lets Next/Webpack emit MapLibre 6's separate module worker.
maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);
function homeBounds(island?: boolean) {
  return island ? ISLAND_BOUNDS : TAIWAN_BOUNDS;
}
const weatherColor = "#0a4d74";
const neutralCounty = "#5f6b77";
function fitPadding(compact?: boolean) {
  return {
    top: compact ? 20 : 60,
    bottom: compact ? 30 : 60,
    left: 45,
    right: !compact && window.innerWidth > 1100 ? 315 : 45,
  };
}
function pointData(rows: Observation[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: rows.map((o) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [o.longitude, o.latitude] },
      properties: {
        ...o,
        values: JSON.stringify(o.values),
        color: o.source === "aqi" ? aqiColor(o.status) : weatherColor,
      },
    })),
  };
}

function popupContent(
  p: Observation,
  kind: ObservationKind,
  language: Language,
  retrievedAt: string | null,
) {
  const zh = language === "zh",
    el = document.createElement("div");
  const add = (tag: string, text: string) => {
    const child = document.createElement(tag);
    child.textContent = text;
    el.append(child);
  };
  add(
    "small",
    kind === "aqi"
      ? zh
        ? "空氣品質測站"
        : "AIR QUALITY STATION"
      : zh
        ? "氣象測站"
        : "WEATHER STATION",
  );
  add("h3", p.station);
  if (p.status)
    add("p", zh ? p.status : aqiStatusEnglish[p.status] || p.status);
  const values = p.values;
  const labels =
    kind === "aqi"
      ? {
          aqi: "AQI",
          pm25: "PM₂.₅ · µg/m³",
          pm10: "PM₁₀ · µg/m³",
          o3: "O₃ · ppb",
          no2: "NO₂ · ppb",
          so2: "SO₂ · ppb",
          co: "CO · ppm",
        }
      : {
          temperature: zh ? "氣溫 · °C" : "Air temperature · °C",
          rainfall: zh ? "當日累積雨量 · mm" : "Daily rainfall · mm",
          humidity: zh ? "濕度 · %" : "Humidity · %",
          windSpeed: zh ? "風速 · m/s" : "Wind speed · m/s",
          windDirection: zh ? "風向 · °" : "Wind direction · °",
        };
  for (const [key, label] of Object.entries(labels))
    add("p", `${label}: ${values[key] ?? "—"}`);
  const format = (date: string | null) =>
    date
      ? new Intl.DateTimeFormat(zh ? "zh-TW" : "en-GB", {
          timeZone: "Asia/Taipei",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(date)) + " (UTC+8)"
      : "—";
  const stale = observationFreshness(kind, p.observedAt) !== "fresh";
  add(
    "p",
    `${zh ? "觀測" : "Observation"}: ${format(p.observedAt)}${stale ? (zh ? " · 已過期" : " · Stale") : ""}`,
  );
  add("p", `${zh ? "發布" : "Publication"}: ${format(p.publishedAt || null)}`);
  add("p", `${zh ? "最後擷取" : "Last retrieval"}: ${format(retrievedAt)}`);
  add("p", `${p.latitude}° N, ${p.longitude}° E`);
  add(
    "p",
    `${zh ? "來源" : "Source"}: ${kind === "aqi" ? "MOENV · AQX_P_432" : `CWA · ${p.source}`}`,
  );
  add(
    "p",
    zh
      ? "授權：政府資料開放授權條款第 1 版"
      : "Licence: Open Government Data License 1.0",
  );
  const link = document.createElement("a");
  link.textContent = zh ? "原始來源 ↗" : "Original source ↗";
  link.href =
    kind === "aqi"
      ? "https://data.moenv.gov.tw/en/dataset/detail/AQX_P_432"
      : "https://opendata.cwa.gov.tw/devManual/description";
  link.target = "_blank";
  link.rel = "noreferrer";
  el.append(link);
  return el;
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((at) =>
    parseInt(value.slice(at, at + 2), 16),
  );
  return `rgba(${r},${g},${b},${alpha})`;
}

function atlasPopup(
  feature: AtlasFeature,
  overlay: AtlasOverlay,
  language: Language,
) {
  const root = document.createElement("div"),
    zh = language === "zh";
  const add = (tag: string, text: string) => {
    const node = document.createElement(tag);
    node.textContent = text;
    root.append(node);
  };
  add("small", overlay.dataset.title[language]);
  add(
    "h3",
    zh && feature.properties.titleZh
      ? feature.properties.titleZh
      : feature.properties.title,
  );
  if (feature.properties.aggregated)
    add(
      "p",
      zh
        ? "彙整格網，請使用圖表下方的篩選資料列表檢視紀錄。"
        : "Aggregated map cell. Inspect the filtered record list beneath the charts for individual records.",
    );
  else {
    if (feature.properties.date)
      add(
        "p",
        `${zh ? "資料日期" : "Record date"}: ${feature.properties.date}`,
      );
    for (const field of overlay.dataset.fields) {
      const value = feature.properties[field.key];
      if (value !== undefined)
        add(
          "p",
          `${field.label[language]}: ${value === null ? "—" : value}${value !== null && field.unit ? ` ${field.unit}` : ""}`,
        );
    }
  }
  add("p", overlay.dataset.limitation[language]);
  add("p", `${zh ? "授權" : "Licence"}: ${overlay.dataset.licence}`);
  const link = document.createElement("a");
  link.href = `/${overlay.dataset.section}?dataset=${encodeURIComponent(overlay.dataset.id)}`;
  link.textContent = zh
    ? "開啟專題與資料詳情 ↗"
    : "Open subject and record details ↗";
  root.append(link);
  return root;
}

export default function MapCanvas(props: Props) {
  const {
    aqi,
    weather,
    aqiVisible,
    weatherVisible,
    boundariesVisible,
    selectedCounty,
  } = props;
  const pointPopup = useRef<maplibregl.Popup | null>(null);
  const countyHoverPopup = useRef<maplibregl.Popup | null>(null);
  const hazardLayers = useRef<HazardController | null>(null);
  const atlasPopupDataset = useRef<string | null>(null);
  const overlaySpecs = useRef(new Map<string, string>());
  const overlayClickHandlers = useRef(
    new Map<
      string,
      { layerId: string; listener: (event: MapLayerMouseEvent) => void }[]
    >(),
  );
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<LibreMap | null>(null),
    latest = useRef(props);
  const [ready, setReady] = useState(false),
    [idle, setIdle] = useState(false),
    [countyReady, setCountyReady] = useState(false),
    [mapError, setMapError] = useState(false),
    [basemapError, setBasemapError] = useState(false);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    let disposed = false;
    const clickHandlers = overlayClickHandlers.current;
    const specs = overlaySpecs.current;
    let resize: ResizeObserver | undefined;
    const controller = new AbortController();
    const init = async () => {
      let style: StyleSpecification = fallbackStyle;
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_BASEMAP_STYLE ||
            "https://tiles.openfreemap.org/styles/positron",
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(12000),
            ]),
          },
        );
        if (!response.ok) throw new Error("Basemap unavailable");
        style = (await response.json()) as StyleSpecification;
      } catch {
        if (!disposed) setBasemapError(true);
      }
      if (disposed || !container.current) return;
      try {
        const map = new maplibregl.Map({
          container: container.current,
          style,
          bounds: homeBounds(latest.current.island),
          fitBoundsOptions: {
            padding: fitPadding(latest.current.compact),
            duration: 0,
          },
          attributionControl: false,
          minZoom: 3,
          maxZoom: 18,
          // Embedded maps sit inside a scrolling page. Two-finger / ctrl+scroll
          // keeps the page scrollable instead of trapping the pointer.
          cooperativeGestures: !!latest.current.compact,
          locale:
            latest.current.language === "zh"
              ? {
                  "CooperativeGesturesHandler.WindowsHelpText":
                    "按住 Ctrl 並滾動即可縮放地圖",
                  "CooperativeGesturesHandler.MacHelpText":
                    "按住 ⌘ 並滾動即可縮放地圖",
                  "CooperativeGesturesHandler.MobileHelpText":
                    "請用雙指移動地圖",
                }
              : undefined,
        });
        mapRef.current = map;
        const reportViewport = () => {
          const box = map.getBounds();
          const rawWest = box.getWest(),
            rawEast = box.getEast(),
            zoom = map.getZoom();
          if (
            ![rawWest, rawEast, box.getSouth(), box.getNorth(), zoom].every(
              Number.isFinite,
            )
          )
            return;
          const span = rawEast - rawWest;
          if (span <= 0) return;
          const normalizedWest = ((((rawWest + 180) % 360) + 360) % 360) - 180;
          // The map API accepts one non-wrapping rectangle. A crossing viewport
          // conservatively requests all longitudes instead of an invalid bbox.
          const crossesDateline = span >= 360 || normalizedWest + span > 180;
          const west = crossesDateline ? -180 : normalizedWest;
          const east = crossesDateline ? 180 : normalizedWest + span;
          const south = Math.max(-90, Math.min(90, box.getSouth()));
          const north = Math.max(-90, Math.min(90, box.getNorth()));
          if (south >= north || west >= east) return;
          latest.current.onViewport?.({
            bbox: [west, south, east, north],
            zoom,
          });
        };
        map.on("moveend", reportViewport);
        map.on("movestart", () => {
          if (!disposed) setIdle(false);
        });
        map.on("dataloading", () => {
          if (!disposed) setIdle(false);
        });
        map.on("idle", () => {
          if (!disposed) setIdle(true);
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true }),
          "top-right",
        );
        map.addControl(new maplibregl.FullscreenControl(), "top-right");
        map.addControl(
          new maplibregl.ScaleControl({ unit: "metric" }),
          "bottom-left",
        );
        map.addControl(
          new maplibregl.AttributionControl({
            customAttribution:
              '<a href="https://data.gov.tw/en/datasets/7442" target="_blank" rel="noopener noreferrer">NLSC county boundaries</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
            compact: true,
          }),
          "bottom-right",
        );
        map.on("error", (event) => {
          if (!disposed) {
            if (
              /worker/i.test(event.error.message) ||
              ("sourceId" in event && event.sourceId === "counties")
            )
              setMapError(true);
            else setBasemapError(true);
          }
        });
        map.once("style.load", () => {
          if (disposed) return;
          map.on("sourcedata", (event) => {
            if (
              event.sourceId === "counties" &&
              event.isSourceLoaded &&
              !disposed
            ) {
              setCountyReady(true);
            }
          });
          map.addSource("counties", {
            type: "geojson",
            data: latest.current.counties,
            promoteId: "COUNTYCODE",
            tolerance: 0,
          });
          map.addLayer({
            id: "county-fill",
            type: "fill",
            source: "counties",
            paint: {
              "fill-color": [
                "coalesce",
                ["feature-state", "tint"],
                neutralCounty,
              ],
              "fill-color-transition": { duration: 700, delay: 0 },
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "strong"], false],
                [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  0.9,
                  0.72,
                ],
                ["boolean", ["feature-state", "hover"], false],
                0.3,
                ["boolean", ["feature-state", "tinted"], false],
                0.42,
                0.04,
              ],
              "fill-opacity-transition": { duration: 500, delay: 0 },
            },
          });
          map.addLayer({
            id: "county-line",
            type: "line",
            source: "counties",
            paint: {
              "line-color": "#7a8591",
              "line-width": 0.9,
              "line-opacity": 0.75,
            },
          });
          map.addLayer({
            id: "county-selected",
            type: "fill",
            source: "counties",
            filter: ["==", ["get", "COUNTYCODE"], ""],
            paint: { "fill-color": "#16202b", "fill-opacity": 0.07 },
          });
          map.addLayer({
            id: "county-selected-line",
            type: "line",
            source: "counties",
            filter: ["==", ["get", "COUNTYCODE"], ""],
            paint: { "line-color": "#16202b", "line-width": 2.4 },
          });
          let hovered: string | number | undefined;
          const hoverPopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "county-tooltip",
            offset: 12,
          });
          countyHoverPopup.current = hoverPopup;
          map.on("mousemove", "county-fill", (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            if (hovered !== undefined)
              map.setFeatureState(
                { source: "counties", id: hovered },
                { hover: false },
              );
            hovered = feature.id;
            if (hovered !== undefined)
              map.setFeatureState(
                { source: "counties", id: hovered },
                { hover: true },
              );
            map.getCanvas().style.cursor = "pointer";
            const name =
              latest.current.language === "en"
                ? feature.properties.COUNTYENG
                : feature.properties.COUNTYNAME;
            const note = latest.current.countyLabels?.find(
              (label) => label.code === feature.properties.COUNTYCODE,
            )?.text;
            hoverPopup
              .setLngLat(event.lngLat)
              .setText(note ? `${name} · ${note}` : name)
              .addTo(map);
          });
          map.on("mouseleave", "county-fill", () => {
            if (hovered !== undefined)
              map.setFeatureState(
                { source: "counties", id: hovered },
                { hover: false },
              );
            hovered = undefined;
            map.getCanvas().style.cursor = "";
            hoverPopup.remove();
          });
          map.on("click", "county-fill", (event) => {
            const hits = map.queryRenderedFeatures(event.point, {
              layers: [
                "aqi-hit",
                "weather-hit",
                ...hazardHitLayers,
                ...(latest.current.overlays || []).flatMap((overlay) =>
                  ["hit", "line", "fill"].map(
                    (suffix) => `atlas-${overlay.dataset.id}-${suffix}`,
                  ),
                ),
              ].filter((id) => !!map.getLayer(id)),
            });
            if (!hits.length && event.features?.[0])
              latest.current.onSelect(event.features[0].properties.COUNTYCODE);
          });
          for (const kind of ["aqi", "weather"] as ObservationKind[]) {
            map.addSource(kind, { type: "geojson", data: emptyPoints });
            map.addLayer({
              id: `${kind}-points`,
              type: "circle",
              source: kind,
              paint: {
                "circle-color": ["get", "color"],
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  5,
                  5,
                  9,
                  7.5,
                  13,
                  10,
                ],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.6,
              },
            });
            map.addLayer({
              id: `${kind}-ring`,
              type: "circle",
              source: kind,
              filter: ["==", ["get", "id"], ""],
              paint: {
                "circle-color": "rgba(0,0,0,0)",
                "circle-radius": 13,
                "circle-stroke-color": "#16202b",
                "circle-stroke-width": 2,
              },
            });
            // Wider invisible target so stations are easy to hit with a mouse or finger.
            map.addLayer({
              id: `${kind}-hit`,
              type: "circle",
              source: kind,
              // Nearly invisible, and white: stacked black hit areas read as grey smudges.
              paint: {
                "circle-radius": 16,
                "circle-color": "#ffffff",
                "circle-opacity": 0.01,
              },
            });
            map.on("click", `${kind}-hit`, (event) => {
              const feature = event.features?.[0];
              if (!feature || feature.geometry.type !== "Point") return;
              const raw = feature.properties;
              const observation = {
                ...raw,
                values:
                  typeof raw.values === "string"
                    ? JSON.parse(raw.values)
                    : raw.values,
              } as Observation;
              pointPopup.current?.remove();
              atlasPopupDataset.current = null;
              pointPopup.current = new maplibregl.Popup({ maxWidth: "320px" })
                .setLngLat(feature.geometry.coordinates as [number, number])
                .setDOMContent(
                  popupContent(
                    observation,
                    kind,
                    latest.current.language,
                    kind === "aqi"
                      ? latest.current.aqiRetrievedAt
                      : latest.current.weatherRetrievedAt,
                  ),
                )
                .addTo(map);
            });
            map.on("mouseenter", `${kind}-hit`, (event) => {
              hoverPopup.remove();
              map.getCanvas().style.cursor = "pointer";
              const id = event.features?.[0]?.properties?.id;
              if (id !== undefined)
                map.setFilter(`${kind}-ring`, ["==", ["get", "id"], id]);
            });
            map.on("mouseleave", `${kind}-hit`, () => {
              map.getCanvas().style.cursor = "";
              map.setFilter(`${kind}-ring`, ["==", ["get", "id"], ""]);
            });
          }
          hazardLayers.current = installHazardLayers(map, {
            language: () => latest.current.language,
            padding: () => fitPadding(latest.current.compact),
            openPopup: (lngLat, content) => {
              pointPopup.current?.remove();
              atlasPopupDataset.current = null;
              pointPopup.current = new maplibregl.Popup({ maxWidth: "320px" })
                .setLngLat(lngLat)
                .setDOMContent(content)
                .addTo(map);
            },
          });
          setReady(true);
          reportViewport();
          latest.current.onReady?.();
        });
        resize = new ResizeObserver(() => map.resize());
        resize.observe(container.current);
      } catch {
        if (!disposed) setMapError(true);
      }
    };
    void init();
    return () => {
      disposed = true;
      controller.abort();
      resize?.disconnect();
      const map = mapRef.current;
      if (map)
        for (const handlers of clickHandlers.values())
          for (const { layerId, listener } of handlers)
            map.off("click", layerId, listener);
      clickHandlers.clear();
      specs.clear();
      pointPopup.current?.remove();
      pointPopup.current = null;
      countyHoverPopup.current?.remove();
      countyHoverPopup.current = null;
      atlasPopupDataset.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const overlays = props.overlays || [];
    const remove = (id: string) => {
      for (const { layerId, listener } of overlayClickHandlers.current.get(
        id,
      ) || [])
        map.off("click", layerId, listener);
      overlayClickHandlers.current.delete(id);
      if (`atlas-${atlasPopupDataset.current}` === id) {
        pointPopup.current?.remove();
        pointPopup.current = null;
        atlasPopupDataset.current = null;
      }
      for (const suffix of [
        "cellsel",
        "cellhover",
        "selected",
        "ring",
        "hit",
        "points",
        "cellline",
        "cells",
        "stacks",
        "heat",
        "line",
        "fill",
        "raster",
      ])
        if (map.getLayer(`${id}-${suffix}`)) map.removeLayer(`${id}-${suffix}`);
      if (map.getSource(id)) map.removeSource(id);
      if (map.getSource(`${id}-image`)) map.removeSource(`${id}-image`);
      overlaySpecs.current.delete(id);
    };
    for (const id of [...overlaySpecs.current.keys()])
      if (!overlays.some((overlay) => `atlas-${overlay.dataset.id}` === id))
        remove(id);
    for (const overlay of overlays) {
      const id = `atlas-${overlay.dataset.id}`;
      const shape = overlay.data.features.some(
        (feature) => feature.geometry.type !== "Point",
      );
      const spec = `${overlay.mode}:${shape}:${!!overlay.dataset.raster}:${overlay.colorBy || ""}`;
      if (overlaySpecs.current.has(id) && overlaySpecs.current.get(id) !== spec)
        remove(id);
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        if (overlay.dataset.raster) {
          map.addSource(`${id}-image`, {
            type: "image",
            url: overlay.dataset.raster.url,
            coordinates: overlay.dataset.raster.coordinates,
          });
          map.addLayer(
            {
              id: `${id}-raster`,
              type: "raster",
              source: `${id}-image`,
              paint: { "raster-opacity": 0.68, "raster-resampling": "nearest" },
            },
            "county-line",
          );
        }
        if (shape) {
          map.addLayer({
            id: `${id}-fill`,
            type: "fill",
            source: id,
            filter: [
              "all",
              ["==", ["geometry-type"], "Polygon"],
              ["!=", ["get", "tile"], true],
            ],
            paint: { "fill-color": overlay.color, "fill-opacity": 0.25 },
          });
          map.addLayer({
            id: `${id}-line`,
            type: "line",
            source: id,
            filter: [
              "all",
              ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
              ["!=", ["get", "tile"], true],
            ],
            paint: {
              "line-color": overlay.color,
              "line-width": 3,
              "line-opacity": 0.85,
            },
          });
        }
        const heatFilter = ["==", ["geometry-type"], "Point"] as const;
        // Single records only: grid cells are drawn as tiles, not dots.
        const dotFilter = [
          "all",
          ["==", ["geometry-type"], "Point"],
          ["!=", ["get", "aggregated"], true],
        ] as const;
        // Records that share one exact point (for example villages whose public
        // reference point is the same) are drawn as a hollow ring: "several".
        const stackFilter = [
          "all",
          ["==", ["geometry-type"], "Point"],
          ["==", ["get", "aggregated"], true],
          ["!", ["has", "x0"]],
        ] as const;
        const hitFilter = [
          "all",
          ["==", ["geometry-type"], "Point"],
          ["!", ["has", "x0"]],
        ] as const;
        const tileFilter = [
          "all",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["get", "tile"], true],
        ] as const;
        const density = overlay.mode === "density";
        const overlayRamp = subjectRamps[overlay.dataset.section];
        const byAqi = overlay.colorBy === "aqi";
        const byInk = overlay.colorBy === "ink";
        if (density)
          map.addLayer({
            id: `${id}-heat`,
            type: "heatmap",
            source: id,
            maxzoom: 10,
            filter: heatFilter as never,
            paint: {
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["sqrt", ["coalesce", ["get", "count"], 1]],
                1,
                0.25,
                30,
                1,
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4,
                16,
                7,
                26,
                9,
                44,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                0.7,
                9,
                1.3,
              ],
              // The subject ramp, fading in from nothing, so the surface has
              // no hard edge and carries the same hue as the rest of the page.
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                withAlpha(overlayRamp[0], 0),
                0.12,
                withAlpha(overlayRamp[0], 0.55),
                0.3,
                withAlpha(overlayRamp[1], 0.72),
                0.55,
                withAlpha(overlayRamp[2], 0.82),
                0.8,
                withAlpha(overlayRamp[3], 0.88),
                1,
                withAlpha(overlayRamp[4], 0.92),
              ],
              "heatmap-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                0.95,
                10,
                0,
              ],
            },
          });
        // A square tile per grid cell, shaded by how many records it holds.
        // Squares never overlap and carry no number, so a crowded coast reads
        // as a pattern instead of a pile of circles.
        map.addLayer({
          id: `${id}-cells`,
          type: "fill",
          source: id,
          filter: tileFilter as never,
          paint: {
            "fill-color": ["get", "tileColor"],
            // Opaque, so neighbouring squares of one class merge into a single
            // soft area and the lightness steps carry the pattern.
            "fill-opacity": (density
              ? ["interpolate", ["linear"], ["zoom"], 8, 0, 10, 1]
              : 1) as never,
          },
        });
        map.addLayer({
          id: `${id}-cellline`,
          type: "line",
          source: id,
          filter: tileFilter as never,
          // A round-joined edge in the tile's own colour: it closes the hairline
          // seams between squares and takes the sharpness off the corners.
          layout: { "line-join": "round" },
          paint: {
            "line-color": ["get", "tileColor"],
            "line-width": 2.5,
            "line-opacity": (density
              ? ["interpolate", ["linear"], ["zoom"], 8, 0, 10, 1]
              : 1) as never,
          },
        });
        map.addLayer({
          id: `${id}-cellhover`,
          type: "line",
          source: id,
          filter: ["==", ["get", "id"], ""],
          paint: { "line-color": "#16202b", "line-width": 2.5 },
        });
        map.addLayer({
          id: `${id}-cellsel`,
          type: "line",
          source: id,
          filter: ["==", ["get", "id"], ""],
          paint: { "line-color": "#16202b", "line-width": 3.5 },
        });
        // One small, crisp dot per record. Every dot is the same size, so size
        // never competes with colour; the hit area below stays generous.
        map.addLayer({
          id: `${id}-points`,
          type: "circle",
          source: id,
          minzoom: density ? 7 : 0,
          filter: dotFilter as never,
          paint: {
            "circle-color": (byAqi
              ? [
                  "case",
                  ["==", ["typeof", ["get", "aqi"]], "number"],
                  [
                    "step",
                    ["get", "aqi"],
                    aqiColours["良好"],
                    51,
                    aqiColours["普通"],
                    101,
                    aqiColours["對敏感族群不健康"],
                    151,
                    aqiColours["對所有族群不健康"],
                    201,
                    aqiColours["非常不健康"],
                    301,
                    aqiColours["危害"],
                  ],
                  overlay.color,
                ]
              : byInk
                ? "#16202b"
                : overlay.color) as never,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,
              2.6,
              9,
              3.8,
              13,
              6.5,
            ] as never,
            "circle-opacity": 0.95,
            "circle-stroke-color": byAqi ? "#16202b" : "#ffffff",
            "circle-stroke-width": 1.2,
          },
        });
        map.addLayer({
          id: `${id}-stacks`,
          type: "circle",
          source: id,
          minzoom: density ? 7 : 0,
          filter: stackFilter as never,
          paint: {
            "circle-color": "#ffffff",
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,
              4,
              9,
              5.2,
              13,
              8,
            ] as never,
            "circle-stroke-color": byInk ? "#16202b" : overlay.color,
            "circle-stroke-width": 2.5,
          },
        });
        map.addLayer({
          id: `${id}-ring`,
          type: "circle",
          source: id,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-color": "rgba(0,0,0,0)",
            "circle-radius": 9,
            "circle-stroke-color": "#16202b",
            "circle-stroke-width": 2,
          },
        });
        // Persistent mark for the record whose details are open.
        map.addLayer({
          id: `${id}-selected`,
          type: "circle",
          source: id,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-color": "rgba(0,0,0,0)",
            "circle-radius": 11,
            "circle-stroke-color": "#16202b",
            "circle-stroke-width": 3,
          },
        });
        map.addLayer({
          id: `${id}-hit`,
          type: "circle",
          source: id,
          minzoom: density ? 7 : 0,
          filter: hitFilter as never,
          paint: {
            "circle-radius": 12,
            "circle-color": "#ffffff",
            "circle-opacity": 0.01,
          },
        });
        const handlers: {
          layerId: string;
          listener: (event: MapLayerMouseEvent) => void;
        }[] = [];
        const tip = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "county-tooltip",
          offset: 14,
        });
        const hover = (raw: { properties: Record<string, unknown> } | null) => {
          const tile = !!raw?.properties.tile,
            key = raw ? String(raw.properties.id) : "";
          map.setFilter(`${id}-ring`, ["==", ["get", "id"], tile ? "" : key]);
          map.setFilter(`${id}-cellhover`, [
            "==",
            ["get", "id"],
            tile ? key : "",
          ]);
        };
        for (const layerId of [`${id}-hit`, `${id}-cells`]) {
          map.on("mousemove", layerId, (event) => {
            const raw = event.features?.[0];
            if (!raw) return;
            map.getCanvas().style.cursor = "pointer";
            hover(raw);
            if (raw.properties.aggregated) {
              const n = Number(raw.properties.count || 0).toLocaleString(),
                zh = latest.current.language === "zh",
                split = raw.properties.split === true;
              tip
                .setLngLat(event.lngLat)
                .setText(
                  split
                    ? zh
                      ? `${n} 筆紀錄・點擊放大`
                      : `${n} records · click to zoom in`
                    : zh
                      ? `${n} 筆紀錄・點擊查看`
                      : `${n} records · click for details`,
                )
                .addTo(map);
            } else tip.remove();
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
            hover(null);
            tip.remove();
          });
        }
        for (const suffix of ["hit", "cells", "line", "fill"])
          if (map.getLayer(`${id}-${suffix}`)) {
            const layerId = `${id}-${suffix}`;
            const listener = (event: MapLayerMouseEvent) => {
              const raw = event.features?.[0];
              const current = latest.current.overlays?.find(
                (item) => item.dataset.id === overlay.dataset.id,
              );
              if (!raw || !current) return;
              let geometry = raw.geometry as AtlasFeature["geometry"];
              if (raw.properties.tile) {
                const x0 = Number(raw.properties.x0),
                  y0 = Number(raw.properties.y0),
                  x1 = Number(raw.properties.x1),
                  y1 = Number(raw.properties.y1);
                geometry = {
                  type: "Point",
                  coordinates: [(x0 + x1) / 2, (y0 + y1) / 2],
                };
                // A tile made of finer grid cells opens up; a tile the source
                // published as one coarse cell cannot be split, so it opens
                // its details instead.
                if (raw.properties.split === true && map.getZoom() < 12) {
                  tip.remove();
                  map.fitBounds(
                    [
                      [x0, y0],
                      [x1, y1],
                    ],
                    { padding: 40, maxZoom: 14, duration: 600 },
                  );
                  return;
                }
              }
              // Past this zoom, records that still share one point are
              // co-located (generalized positions); report the group itself.
              const properties = { ...raw.properties };
              delete properties.tile;
              delete properties.tileColor;
              const feature = {
                type: "Feature",
                geometry,
                properties,
              } as AtlasFeature;
              pointPopup.current?.remove();
              atlasPopupDataset.current = current.dataset.id;
              if (!latest.current.externalInspector)
                pointPopup.current = new maplibregl.Popup({ maxWidth: "340px" })
                  .setLngLat(event.lngLat)
                  .setDOMContent(
                    atlasPopup(feature, current, latest.current.language),
                  )
                  .addTo(map);
              latest.current.onAtlasSelect?.(current.dataset.id, feature);
            };
            map.on("click", layerId, listener);
            handlers.push({ layerId, listener });
          }
        overlayClickHandlers.current.set(id, handlers);
        overlaySpecs.current.set(id, spec);
      }
      (map.getSource(id) as GeoJSONSource).setData(
        overlay.dataset.raster
          ? { type: "FeatureCollection", features: [] }
          : tileCollection(
              overlay.data,
              overlay.dataset.section,
              overlay.colorBy === "ink",
            ).data,
      );
    }
  }, [ready, props.overlays]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const overlay of props.overlays || []) {
      const layer = `atlas-${overlay.dataset.id}-selected`;
      if (!map.getLayer(layer)) continue;
      const focus =
        props.focusedAtlas?.datasetId === overlay.dataset.id
          ? props.focusedAtlas.feature
          : null;
      const id = focus?.properties.id ?? "";
      // A selected square is outlined by its own layer; only dots and stacks
      // get the circle, so the two never stack into a double ring.
      map.setFilter(layer, [
        "all",
        ["==", ["get", "id"], id],
        ["!", ["has", "x0"]],
      ]);
      const cellLayer = layer.replace(/-selected$/, "-cellsel");
      if (map.getLayer(cellLayer))
        map.setFilter(cellLayer, ["==", ["get", "id"], id]);
    }
  }, [ready, props.overlays, props.focusedAtlas]);
  const focusedOverlayAvailable =
    !!props.focusedAtlas &&
    !!props.overlays?.some(
      (overlay) => overlay.dataset.id === props.focusedAtlas?.datasetId,
    );
  useEffect(() => {
    const map = mapRef.current,
      focus = props.focusedAtlas;
    if (!ready || !map || !focus || !focusedOverlayAvailable) return;
    const overlay = latest.current.overlays?.find(
      (item) => item.dataset.id === focus.datasetId,
    );
    if (!overlay) return;
    const county = overlay.dataset.raster
      ? latest.current.counties.features.find(
          (item) =>
            item.properties.COUNTYCODE === focus.feature.properties.countyCode,
        )
      : undefined;
    const box = boundsOfCoordinates(
      county?.geometry.coordinates || focus.feature.geometry.coordinates,
    );
    const center: [number, number] =
      focus.feature.geometry.type === "Point"
        ? [
            focus.feature.geometry.coordinates[0],
            focus.feature.geometry.coordinates[1],
          ]
        : [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2];
    if (focus.fly !== false)
      map.fitBounds(box, {
        maxZoom: 13,
        padding: fitPadding(props.compact),
        duration: 500,
      });
    pointPopup.current?.remove();
    atlasPopupDataset.current = overlay.dataset.id;
    if (latest.current.externalInspector) return;
    pointPopup.current = new maplibregl.Popup({ maxWidth: "340px" })
      .setLngLat(center)
      .setDOMContent(atlasPopup(focus.feature, overlay, props.language))
      .addTo(map);
  }, [
    ready,
    props.focusedAtlas,
    props.language,
    props.compact,
    focusedOverlayAvailable,
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const id of [
      "county-fill",
      "county-line",
      "county-selected",
      "county-selected-line",
    ])
      map.setLayoutProperty(
        id,
        "visibility",
        boundariesVisible ? "visible" : "none",
      );
    for (const [kind, rows, visible] of [
      ["aqi", aqi, aqiVisible],
      ["weather", weather, weatherVisible],
    ] as const) {
      (map.getSource(kind) as GeoJSONSource).setData(pointData(rows));
      for (const suffix of ["points", "hit", "ring"])
        map.setLayoutProperty(
          `${kind}-${suffix}`,
          "visibility",
          visible ? "visible" : "none",
        );
    }
    for (const id of ["county-selected", "county-selected-line"])
      map.setFilter(id, ["==", ["get", "COUNTYCODE"], selectedCounty]);
    // County shading: a supplied choropleth, otherwise the mean AQI of the
    // loaded stations inside each county.
    const choropleth = props.countyTint;
    for (const county of props.counties.features) {
      const code = county.properties.COUNTYCODE;
      if (choropleth) {
        map.setFeatureState(
          { source: "counties", id: code },
          choropleth[code]
            ? { tint: choropleth[code], tinted: true, strong: true }
            : { tint: null, tinted: false, strong: false },
        );
        continue;
      }
      const values = aqiVisible
        ? aqi
            .filter((o) => inCounty(o, code, props.counties))
            .map((o) => o.values.aqi)
            .filter((v): v is number => typeof v === "number")
        : [];
      const mean = values.length
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : null;
      map.setFeatureState(
        { source: "counties", id: code },
        mean === null
          ? { tint: null, tinted: false, strong: false }
          : { tint: aqiTintForValue(mean), tinted: true, strong: false },
      );
    }
  }, [
    ready,
    aqi,
    weather,
    aqiVisible,
    weatherVisible,
    boundariesVisible,
    selectedCounty,
    props.counties,
    props.countyTint,
  ]);
  // Count labels: plain DOM markers, because the basemap style carries no font
  // files and so cannot draw text itself. They ignore the pointer, so a click
  // on a number still selects the county underneath it.
  useEffect(() => {
    const map = mapRef.current;
    const labels = props.countyLabels;
    if (!ready || !map || !labels?.length) return;
    const items = labels.map((label) => {
      const element = document.createElement("div");
      element.className = "county-count";
      element.textContent = label.text;
      element.setAttribute("aria-hidden", "true");
      if (label.code === selectedCounty) element.dataset.selected = "";
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([label.lng, label.lat])
        .addTo(map);
      return { label, element, marker };
    });
    // Roomier counties claim their spot first. A number is shown when its
    // county is at least about half as wide as the number and it would not
    // touch one already placed; zooming in frees up the rest.
    const byRoom = [...items].sort((a, b) => b.label.r - a.label.r);
    const place = () => {
      const perDegree = (512 * 2 ** map.getZoom()) / 360;
      const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
      for (const { label, element } of byRoom) {
        const width = labelWidth(label.text);
        const point = map.project([label.lng, label.lat]);
        const box = {
          x0: point.x - width / 2 - 2,
          x1: point.x + width / 2 + 2,
          y0: point.y - 11,
          y1: point.y + 11,
        };
        const roomy = label.alone || label.r * 2 * perDegree >= width * 0.5;
        const clear = !taken.some(
          (other) =>
            box.x0 < other.x1 &&
            box.x1 > other.x0 &&
            box.y0 < other.y1 &&
            box.y1 > other.y0,
        );
        const show = roomy && clear;
        if (show) taken.push(box);
        element.classList.toggle("is-hidden", !show);
      }
    };
    place();
    map.on("zoom", place);
    map.on("resize", place);
    return () => {
      map.off("zoom", place);
      map.off("resize", place);
      for (const { marker } of items) marker.remove();
    };
  }, [ready, props.countyLabels, selectedCounty]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const feature = props.counties.features.find(
      (f) => f.properties.COUNTYCODE === props.selectedCounty,
    );
    if (feature)
      map.fitBounds(boundsOfCoordinates(feature.geometry.coordinates), {
        padding: fitPadding(props.compact),
        maxZoom: 11,
        duration: 800,
      });
  }, [ready, props.selectedCounty, props.counties, props.compact]);
  useEffect(() => {
    if (ready)
      mapRef.current?.fitBounds(homeBounds(props.island), {
        padding: fitPadding(props.compact),
        duration: 800,
      });
  }, [ready, props.resetToken, props.compact, props.island]);
  // Declared after the home-view fit above: when the map becomes ready, effects
  // run in order, so a storm's own fit has to come last to win.
  useEffect(() => {
    if (!ready) return;
    hazardLayers.current?.update({
      data: props.hazards ?? null,
      quakesVisible: !!props.quakesVisible,
      typhoonVisible: !!props.typhoonVisible,
    });
  }, [
    ready,
    props.hazards,
    props.quakesVisible,
    props.typhoonVisible,
    props.language,
  ]);
  useEffect(() => {
    if (ready && props.focusedHazard)
      hazardLayers.current?.focus(props.focusedHazard);
  }, [ready, props.focusedHazard]);
  useEffect(() => {
    const map = mapRef.current,
      focus = props.focusedObservation;
    if (!ready || !countyReady || !map || !focus) return;
    const rows = focus.kind === "aqi" ? aqi : weather;
    const visible = focus.kind === "aqi" ? aqiVisible : weatherVisible;
    pointPopup.current?.remove();
    atlasPopupDataset.current = null;
    if (!visible || !rows.some((o) => o.id === focus.observation.id)) return;
    const o = focus.observation;
    map.easeTo({
      center: [o.longitude, o.latitude],
      padding: fitPadding(props.compact),
      zoom: 12,
      duration: 500,
    });
    pointPopup.current = new maplibregl.Popup({ maxWidth: "320px" })
      .setLngLat([o.longitude, o.latitude])
      .setDOMContent(
        popupContent(
          o,
          focus.kind,
          props.language,
          focus.kind === "aqi"
            ? props.aqiRetrievedAt
            : props.weatherRetrievedAt,
        ),
      )
      .addTo(map);
  }, [
    ready,
    countyReady,
    props.focusedObservation,
    props.language,
    props.aqiRetrievedAt,
    props.weatherRetrievedAt,
    aqi,
    weather,
    aqiVisible,
    weatherVisible,
    props.compact,
  ]);
  useEffect(() => {
    if (!ready || !container.current) return;
    const zh = props.language === "zh";
    const labels = [
      [".maplibregl-ctrl-zoom-in", "Zoom in", "放大"],
      [".maplibregl-ctrl-zoom-out", "Zoom out", "縮小"],
      [".maplibregl-ctrl-compass", "Reset bearing to north", "回到正北方"],
      [".maplibregl-ctrl-fullscreen", "Enter fullscreen", "進入全螢幕"],
      [".maplibregl-ctrl-shrink", "Exit fullscreen", "離開全螢幕"],
      [".maplibregl-ctrl-attrib-button", "Toggle attribution", "切換來源標示"],
    ];
    const update = () => {
      for (const [selector, en, chinese] of labels) {
        const button = container.current?.querySelector(selector);
        button?.setAttribute("aria-label", zh ? chinese : en);
        button?.setAttribute("title", zh ? chinese : en);
      }
    };
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [ready, props.language]);
  const zh = props.language === "zh";
  return (
    <div
      className="map-canvas-shell"
      data-map-ready={ready && countyReady}
      data-map-idle={idle}
    >
      <div
        ref={container}
        className="map-canvas"
        role="region"
        aria-label={zh ? "臺灣互動地圖" : "Interactive map of Taiwan"}
      />
      {(!ready || !countyReady) && !mapError && (
        <div className="map-loading">
          <span className="loading-ring" />
          {zh ? "載入地圖中…" : "Preparing your atlas…"}
        </div>
      )}
      {mapError && (
        <div className="map-loading map-failed">
          <TriangleAlert />
          {zh
            ? "無法啟動地圖繪製器。請確認瀏覽器支援 WebGL 並允許載入地圖資源。縣市與資料控制仍可使用。"
            : "Map renderer could not start. Check WebGL support and map resource access. County and data controls remain available."}
        </div>
      )}
      {basemapError && !mapError && (
        <div className="map-warning">
          {zh
            ? "部分底圖無法載入；官方縣市圖層仍保留。"
            : "Some basemap content is unavailable. Official county geometry is retained."}
        </div>
      )}
      <button
        className="map-reset icon-button"
        onClick={() =>
          mapRef.current?.fitBounds(homeBounds(props.island), {
            padding: fitPadding(props.compact),
            duration: 800,
          })
        }
        aria-label={zh ? "重設臺灣地圖" : "Reset Taiwan map"}
        title={zh ? "完整範圍" : "Reset extent"}
      >
        <LocateFixed size={19} />
      </button>
    </div>
  );
}
