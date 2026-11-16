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
import { boundsOfCoordinates, TAIWAN_BOUNDS } from "@/lib/geo";
import { aqiColor, aqiStatusEnglish } from "@/lib/transform";
import { observationFreshness } from "@/lib/freshness";
import type { AtlasFeature, AtlasOverlay } from "@/lib/atlas-types";

interface Props {
  overlays?: AtlasOverlay[];
  onViewport?: (viewport: {
    bbox: [number, number, number, number];
    zoom: number;
  }) => void;
  onAtlasSelect?: (datasetId: string, feature: AtlasFeature) => void;
  focusedAtlas?: { datasetId: string; feature: AtlasFeature } | null;
  compact?: boolean;
  counties: Counties;
  selectedCounty: string;
  boundariesVisible: boolean;
  aqi: Observation[];
  weather: Observation[];
  aqiVisible: boolean;
  weatherVisible: boolean;
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
      paint: { "background-color": "#e8f0f0" },
    },
  ],
};
// Explicit asset URL lets Next/Webpack emit MapLibre 6's separate module worker.
maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);
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
        color: o.source === "aqi" ? aqiColor(o.status) : "#4384ac",
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
            "https://tiles.openfreemap.org/styles/liberty",
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
          bounds: TAIWAN_BOUNDS,
          fitBoundsOptions: {
            padding: fitPadding(latest.current.compact),
            duration: 0,
          },
          attributionControl: false,
          minZoom: 3,
          maxZoom: 18,
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
              "fill-color": "#40927c",
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.28,
                0.1,
              ],
            },
          });
          map.addLayer({
            id: "county-line",
            type: "line",
            source: "counties",
            paint: {
              "line-color": "#568e7d",
              "line-width": 1,
              "line-opacity": 0.7,
            },
          });
          map.addLayer({
            id: "county-selected",
            type: "fill",
            source: "counties",
            filter: ["==", ["get", "COUNTYCODE"], ""],
            paint: { "fill-color": "#18765e", "fill-opacity": 0.26 },
          });
          map.addLayer({
            id: "county-selected-line",
            type: "line",
            source: "counties",
            filter: ["==", ["get", "COUNTYCODE"], ""],
            paint: { "line-color": "#0d6c52", "line-width": 2.5 },
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
            hoverPopup.setLngLat(event.lngLat).setText(name).addTo(map);
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
                "aqi-points",
                "weather-points",
                "aqi-clusters",
                "weather-clusters",
                ...(latest.current.overlays || []).flatMap((overlay) =>
                  ["points", "clusters", "line", "fill"].map(
                    (suffix) => `atlas-${overlay.dataset.id}-${suffix}`,
                  ),
                ),
              ].filter((id) => !!map.getLayer(id)),
            });
            if (!hits.length && event.features?.[0])
              latest.current.onSelect(event.features[0].properties.COUNTYCODE);
          });
          for (const kind of ["aqi", "weather"] as ObservationKind[]) {
            map.addSource(kind, {
              type: "geojson",
              data: emptyPoints,
              cluster: true,
              clusterMaxZoom: 11,
              clusterRadius: 42,
            });
            map.addLayer({
              id: `${kind}-clusters`,
              type: "circle",
              source: kind,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": kind === "aqi" ? "#d69a47" : "#4384ac",
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  17,
                  20,
                  22,
                  100,
                  28,
                ],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2,
              },
            });
            map.addLayer({
              id: `${kind}-cluster-label`,
              type: "symbol",
              source: kind,
              filter: ["has", "point_count"],
              layout: {
                "text-field": ["get", "point_count_abbreviated"],
                "text-size": 12,
              },
              paint: { "text-color": "#ffffff" },
            });
            map.addLayer({
              id: `${kind}-points`,
              type: "circle",
              source: kind,
              filter: ["!", ["has", "point_count"]],
              paint: {
                "circle-color": ["get", "color"],
                "circle-radius": 6.5,
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
              },
            });
            map.on("click", `${kind}-clusters`, async (event) => {
              const feature = event.features?.[0];
              if (!feature || feature.geometry.type !== "Point") return;
              try {
                const zoom = await (
                  map.getSource(kind) as GeoJSONSource
                ).getClusterExpansionZoom(feature.properties.cluster_id);
                if (!disposed)
                  map.easeTo({
                    center: feature.geometry.coordinates as [number, number],
                    zoom,
                  });
              } catch {
                /* Source may be removed during navigation. */
              }
            });
            map.on("click", `${kind}-points`, (event) => {
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
            for (const layer of [`${kind}-points`, `${kind}-clusters`]) {
              map.on("mouseenter", layer, () => {
                hoverPopup.remove();
                map.getCanvas().style.cursor = "pointer";
              });
              map.on("mouseleave", layer, () => {
                map.getCanvas().style.cursor = "";
              });
            }
          }
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
        "label",
        "points",
        "clusters",
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
      const spec = `${overlay.mode}:${shape}:${!!overlay.dataset.raster}`;
      if (overlaySpecs.current.has(id) && overlaySpecs.current.get(id) !== spec)
        remove(id);
      if (!map.getSource(id)) {
        const clusters = !shape && overlay.mode === "clusters";
        map.addSource(id, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: clusters,
          clusterRadius: 42,
          ...(clusters
            ? {
                clusterProperties: {
                  records: ["+", ["coalesce", ["get", "count"], 1]],
                },
              }
            : {}),
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
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: { "fill-color": overlay.color, "fill-opacity": 0.25 },
          });
          map.addLayer({
            id: `${id}-line`,
            type: "line",
            source: id,
            filter: [
              "in",
              ["geometry-type"],
              ["literal", ["LineString", "Polygon"]],
            ],
            paint: {
              "line-color": overlay.color,
              "line-width": 3,
              "line-opacity": 0.85,
            },
          });
        }
        if (clusters) {
          map.addLayer({
            id: `${id}-clusters`,
            type: "circle",
            source: id,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": overlay.color,
              "circle-radius": 21,
              "circle-stroke-color": "#fff",
              "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: `${id}-label`,
            type: "symbol",
            source: id,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["to-string", ["get", "records"]],
              "text-size": 11,
            },
            paint: { "text-color": "#fff" },
          });
        }
        if (overlay.mode === "heatmap")
          map.addLayer({
            id: `${id}-heat`,
            type: "heatmap",
            source: id,
            paint: {
              "heatmap-weight": ["coalesce", ["get", "count"], 1],
              "heatmap-radius": 25,
              "heatmap-opacity": 0.65,
            },
          });
        map.addLayer({
          id: `${id}-points`,
          type: "circle",
          source: id,
          filter: [
            "all",
            ["==", ["geometry-type"], "Point"],
            ["!", ["has", "point_count"]],
          ],
          paint: {
            "circle-color": overlay.color,
            "circle-radius": overlay.mode === "heatmap" ? 3 : 5,
            "circle-opacity": overlay.mode === "heatmap" ? 0.4 : 0.9,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1.2,
          },
        });
        const handlers: {
          layerId: string;
          listener: (event: MapLayerMouseEvent) => void;
        }[] = [];
        for (const suffix of ["points", "line", "fill", "clusters"])
          if (map.getLayer(`${id}-${suffix}`)) {
            const layerId = `${id}-${suffix}`;
            const listener = (event: MapLayerMouseEvent) => {
              const raw = event.features?.[0];
              const current = latest.current.overlays?.find(
                (item) => item.dataset.id === overlay.dataset.id,
              );
              if (!raw || !current) return;
              if (raw.properties.cluster_id !== undefined) {
                const source = map.getSource(id) as GeoJSONSource | undefined;
                if (!source) return;
                void source
                  .getClusterExpansionZoom(raw.properties.cluster_id)
                  .then((zoom) => {
                    if (
                      mapRef.current === map &&
                      map.getSource(id) === source &&
                      raw.geometry.type === "Point"
                    )
                      map.easeTo({
                        center: raw.geometry.coordinates as [number, number],
                        zoom,
                      });
                  })
                  .catch(() => {});
                return;
              }
              const feature = {
                type: "Feature",
                geometry: raw.geometry,
                properties: raw.properties,
              } as AtlasFeature;
              pointPopup.current?.remove();
              atlasPopupDataset.current = current.dataset.id;
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
          : overlay.data,
      );
    }
  }, [ready, props.overlays]);
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
    map.fitBounds(box, {
      maxZoom: 13,
      padding: fitPadding(props.compact),
      duration: 500,
    });
    pointPopup.current?.remove();
    atlasPopupDataset.current = overlay.dataset.id;
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
      for (const suffix of ["points", "clusters", "cluster-label"])
        map.setLayoutProperty(
          `${kind}-${suffix}`,
          "visibility",
          visible ? "visible" : "none",
        );
    }
    for (const id of ["county-selected", "county-selected-line"])
      map.setFilter(id, ["==", ["get", "COUNTYCODE"], selectedCounty]);
  }, [
    ready,
    aqi,
    weather,
    aqiVisible,
    weatherVisible,
    boundariesVisible,
    selectedCounty,
  ]);
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
      mapRef.current?.fitBounds(TAIWAN_BOUNDS, {
        padding: fitPadding(props.compact),
        duration: 800,
      });
  }, [ready, props.resetToken, props.compact]);
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
          mapRef.current?.fitBounds(TAIWAN_BOUNDS, {
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
