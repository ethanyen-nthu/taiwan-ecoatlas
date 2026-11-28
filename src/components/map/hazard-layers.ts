import * as maplibregl from "maplibre-gl";
import type {
  GeoJSONSource,
  Map as LibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import type { FeatureCollection, LineString, Point, Polygon } from "geojson";
import { TAIWAN_BOUNDS } from "@/lib/geo";
import { cycloneFeatures, quakeFeatures } from "@/lib/hazard-geo";
import {
  ageWords,
  countyName,
  cycloneClass,
  cycloneClassLabels,
  cycloneName,
  intensityBandLabels,
  intensityText,
  type Cyclone,
  type Earthquake,
  type Fix,
  type HazardsResponse,
} from "@/lib/hazards";
import type { Language } from "@/lib/types";

/** The layers a click on the map should reach before the county underneath. */
export const hazardHitLayers = ["quake-hit", "typhoon-hit"];
export const typhoonColour = "#4a3aa7";
const quakeStroke = "rgba(22, 32, 43, 0.6)";
const typhoonPageUrl = "https://www.cwa.gov.tw/V8/E/P/Typhoon/TY_NEWS.html";
const dataManualUrl = "https://opendata.cwa.gov.tw/devManual/description";

const empty = <
  G extends Point | LineString | Polygon,
>(): FeatureCollection<G> => ({
  type: "FeatureCollection",
  features: [],
});

// ----------------------------------------------------------------- popups --

const formatTime = (iso: string | null, language: Language) =>
  iso
    ? `${new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : "en-GB", {
        timeZone: "Asia/Taipei",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))} (UTC+8)`
    : "—";

/** A popup can run longer than the screen, so it scrolls and takes focus. */
function builder(label: string) {
  const root = document.createElement("div");
  root.className = "hazard-popup";
  root.tabIndex = 0;
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", label);
  return {
    root,
    add(tag: string, content: string) {
      const node = document.createElement(tag);
      node.textContent = content;
      root.append(node);
      return node;
    },
    link(href: string, label: string) {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.textContent = label;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      root.append(anchor);
    },
  };
}

export function quakePopup(event: Earthquake, language: Language, now: number) {
  const zh = language === "zh";
  const { root, add, link } = builder(
    zh ? "有感地震資料" : "Felt earthquake details",
  );
  const county = (name: string) => countyName(name, language);
  add("small", zh ? "有感地震" : "FELT EARTHQUAKE");
  add(
    "h3",
    event.magnitude !== null
      ? zh
        ? `規模 ${event.magnitude.toFixed(1)}`
        : `Magnitude ${event.magnitude.toFixed(1)}`
      : zh
        ? "未提供規模"
        : "Magnitude not reported",
  );
  const ago = ageWords(event.originTime, now, language);
  add(
    "p",
    `${formatTime(event.originTime, language)}${ago ? ` · ${ago}` : ""}`,
  );
  add(
    "p",
    `${zh ? "震源深度" : "Focal depth"}: ${event.depthKm !== null ? `${event.depthKm} km` : "—"}`,
  );
  if (event.areas.length) {
    const [top, ...rest] = event.areas;
    add(
      "p",
      zh
        ? `最大震度：${county(top.county)} ${intensityText(top.intensity, "zh")}`
        : `Strongest shaking: ${county(top.county)}, intensity ${intensityText(top.intensity, "en")}`,
    );
    if (rest.length)
      add(
        "p",
        `${zh ? "其他地區" : "Also felt"}: ${rest
          .slice(0, 6)
          .map(
            (a) =>
              `${county(a.county)} ${intensityText(a.intensity, language)}`,
          )
          .join(zh ? "、" : ", ")}${rest.length > 6 ? (zh ? "…" : "…") : ""}`,
      );
  } else add("p", intensityBandLabels.unknown[language]);
  add(
    "p",
    `${zh ? "震央" : "Epicentre"}: ${event.latitude}° N, ${event.longitude}° E`,
  );
  if (event.locationZh)
    add(
      "p",
      `${zh ? "氣象署描述" : "CWA description (Chinese)"}: ${event.locationZh}`,
    );
  add(
    "p",
    zh
      ? "規模是地震在震源的大小；震度是各地實際搖晃的程度。"
      : "Magnitude is the size of the earthquake at its source. Intensity is how strongly the ground shook at a place.",
  );
  add(
    "p",
    zh
      ? `來源：中央氣象署 ${event.feed === "significant" ? "E-A0015-001 顯著有感地震報告" : "E-A0016-001 小區域有感地震報告"}`
      : `Source: CWA · ${event.feed === "significant" ? "E-A0015-001, significant felt earthquakes" : "E-A0016-001, small-area felt earthquakes"}`,
  );
  add(
    "p",
    zh
      ? "授權：政府資料開放授權條款第 1 版"
      : "Licence: Open Government Data License 1.0",
  );
  link(
    event.reportUrl ?? dataManualUrl,
    event.reportUrl
      ? zh
        ? "氣象署地震報告 ↗"
        : "CWA earthquake report ↗"
      : zh
        ? "原始來源 ↗"
        : "Original source ↗",
  );
  return root;
}

export function fixPopup(
  cyclone: Cyclone,
  fix: Fix,
  kind: "past" | "current" | "forecast",
  language: Language,
  now: number,
) {
  const zh = language === "zh";
  const { root, add, link } = builder(
    zh
      ? `${cycloneName(cyclone, language)}路徑資料`
      : `${cycloneName(cyclone, language)} track details`,
  );
  const klass = cycloneClass(cyclone.current?.maxWindMs ?? null);
  add(
    "small",
    kind === "forecast"
      ? zh
        ? "預測位置"
        : "FORECAST POSITION"
      : kind === "current"
        ? zh
          ? "最新分析位置"
          : "LATEST ANALYSED POSITION"
        : zh
          ? "過去分析位置"
          : "PAST ANALYSED POSITION",
  );
  add("h3", cycloneName(cyclone, language));
  if (klass) add("p", cycloneClassLabels[klass][language]);
  add(
    "p",
    kind === "forecast"
      ? `${formatTime(fix.time, language)}${fix.tauHours !== null ? ` · ${zh ? `預測 ${fix.tauHours} 小時後` : `${fix.tauHours} h ahead`}` : ""}`
      : `${formatTime(fix.time, language)}${fix.time && ageWords(fix.time, now, language) ? ` · ${ageWords(fix.time, now, language)}` : ""}`,
  );
  const row = (label: string, value: number | string | null, unit: string) =>
    add("p", `${label}: ${value === null ? "—" : `${value}${unit}`}`);
  row(zh ? "最大風速" : "Maximum wind", fix.maxWindMs, " m/s");
  row(zh ? "最大陣風" : "Maximum gust", fix.gustMs, " m/s");
  row(zh ? "中心氣壓" : "Central pressure", fix.pressureHpa, " hPa");
  row(
    zh ? "移動" : "Moving",
    fix.speedKmh !== null
      ? `${fix.speedKmh} km/h${fix.direction ? ` ${fix.direction}` : ""}`
      : null,
    "",
  );
  if (fix.radius15 !== null)
    row(
      zh ? "七級風暴風半徑" : "Radius of 15 m/s winds (Beaufort 7)",
      fix.radius15,
      " km",
    );
  if (fix.radius25 !== null)
    row(
      zh ? "十級風暴風半徑" : "Radius of 25 m/s winds (storm force)",
      fix.radius25,
      " km",
    );
  if (fix.radius70 !== null)
    row(
      zh ? "70% 機率半徑" : "Radius holding the centre with 70% probability",
      fix.radius70,
      " km",
    );
  add(
    "p",
    `${zh ? "座標" : "Position"}: ${fix.latitude}° N, ${fix.longitude}° E`,
  );
  add(
    "p",
    zh
      ? "這是氣象署公布的位置與預測的地圖，不是警報。颱風警報請見氣象署。"
      : "A map of what the agency has published, not a warning. For warnings, go to the CWA.",
  );
  add(
    "p",
    zh
      ? "來源：中央氣象署 W-C0034-005 熱帶氣旋路徑"
      : "Source: CWA · W-C0034-005, tropical cyclone tracks",
  );
  add(
    "p",
    zh
      ? "授權：政府資料開放授權條款第 1 版"
      : "Licence: Open Government Data License 1.0",
  );
  link(typhoonPageUrl, zh ? "氣象署颱風消息 ↗" : "CWA typhoon news ↗");
  return root;
}

// ------------------------------------------------------------ the layers --

export interface HazardContext {
  language: () => Language;
  /** Room the map's own controls take, so a fit does not hide a typhoon. */
  padding: () => maplibregl.PaddingOptions;
  openPopup: (lngLat: [number, number], content: HTMLElement) => void;
}
export interface HazardState {
  data: HazardsResponse | null;
  quakesVisible: boolean;
  typhoonVisible: boolean;
}
/** A report chosen from the list beside the map rather than on the map. */
export type HazardTarget =
  { kind: "quake"; id: string } | { kind: "cyclone"; id: string };
export interface HazardController {
  update(state: HazardState): void;
  /** Move to a report and open the same popup a click on it would open. */
  focus(target: HazardTarget): void;
  dispose(): void;
}

const quakeLayerIds = ["quake-points", "quake-hit"];
const typhoonLayerIds = [
  "typhoon-wind15-fill",
  "typhoon-wind15-line",
  "typhoon-wind25-fill",
  "typhoon-wind25-line",
  "typhoon-p70-line",
  "typhoon-past-line",
  "typhoon-forecast-line",
  "typhoon-fix-points",
  "typhoon-hit",
];

export function installHazardLayers(
  map: LibreMap,
  context: HazardContext,
): HazardController {
  map.addSource("quakes", { type: "geojson", data: empty<Point>() });
  map.addSource("typhoon-areas", { type: "geojson", data: empty<Polygon>() });
  map.addSource("typhoon-tracks", {
    type: "geojson",
    data: empty<LineString>(),
  });
  map.addSource("typhoon-fixes", { type: "geojson", data: empty<Point>() });
  const areaFilter = (kind: string) =>
    ["==", ["get", "kind"], kind] as maplibregl.FilterSpecification;
  const trackFilter = (kind: string) =>
    ["==", ["get", "kind"], kind] as maplibregl.FilterSpecification;

  map.addLayer({
    id: "typhoon-wind15-fill",
    type: "fill",
    source: "typhoon-areas",
    filter: areaFilter("wind15"),
    paint: { "fill-color": typhoonColour, "fill-opacity": 0.13 },
  });
  map.addLayer({
    id: "typhoon-wind15-line",
    type: "line",
    source: "typhoon-areas",
    filter: areaFilter("wind15"),
    paint: {
      "line-color": typhoonColour,
      "line-width": 1.2,
      "line-opacity": 0.8,
    },
  });
  map.addLayer({
    id: "typhoon-wind25-fill",
    type: "fill",
    source: "typhoon-areas",
    filter: areaFilter("wind25"),
    paint: { "fill-color": typhoonColour, "fill-opacity": 0.2 },
  });
  map.addLayer({
    id: "typhoon-wind25-line",
    type: "line",
    source: "typhoon-areas",
    filter: areaFilter("wind25"),
    paint: { "line-color": typhoonColour, "line-width": 1.4 },
  });
  map.addLayer({
    id: "typhoon-p70-line",
    type: "line",
    source: "typhoon-areas",
    filter: areaFilter("p70"),
    paint: {
      "line-color": typhoonColour,
      "line-width": 1.1,
      "line-opacity": 0.55,
      "line-dasharray": [2, 2],
    },
  });
  map.addLayer({
    id: "typhoon-past-line",
    type: "line",
    source: "typhoon-tracks",
    filter: trackFilter("past"),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": typhoonColour, "line-width": 2.6 },
  });
  map.addLayer({
    id: "typhoon-forecast-line",
    type: "line",
    source: "typhoon-tracks",
    filter: trackFilter("forecast"),
    paint: {
      "line-color": typhoonColour,
      "line-width": 2.2,
      "line-dasharray": [2, 1.6],
    },
  });
  map.addLayer({
    id: "typhoon-fix-points",
    type: "circle",
    source: "typhoon-fixes",
    paint: {
      "circle-color": [
        "match",
        ["get", "kind"],
        "forecast",
        "#ffffff",
        typhoonColour,
      ],
      "circle-radius": [
        "match",
        ["get", "kind"],
        "current",
        8.5,
        "forecast",
        4.8,
        3.2,
      ],
      "circle-stroke-color": [
        "match",
        ["get", "kind"],
        "forecast",
        typhoonColour,
        "#ffffff",
      ],
      "circle-stroke-width": [
        "match",
        ["get", "kind"],
        "current",
        2.6,
        "forecast",
        2,
        1,
      ],
    },
  });
  map.addLayer({
    id: "typhoon-hit",
    type: "circle",
    source: "typhoon-fixes",
    paint: {
      "circle-radius": 14,
      "circle-color": "#ffffff",
      "circle-opacity": 0.01,
    },
  });

  map.addLayer({
    id: "quake-points",
    type: "circle",
    source: "quakes",
    layout: { "circle-sort-key": ["-", 0, ["get", "radius"]] },
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["get", "radius"],
      "circle-opacity": 0.88,
      "circle-stroke-color": quakeStroke,
      "circle-stroke-width": 1,
    },
  });
  map.addLayer({
    id: "quake-hit",
    type: "circle",
    source: "quakes",
    paint: {
      "circle-radius": ["max", 14, ["+", ["get", "radius"], 4]],
      "circle-color": "#ffffff",
      "circle-opacity": 0.01,
    },
  });

  let labels: maplibregl.Marker[] = [];
  /** Which cyclones the view was last fitted to; null while the layer is off. */
  let fittedFor: string | null = null;
  const byQuake = new Map<string, Earthquake>();
  const byCyclone = new Map<string, Cyclone>();

  const hover = (layer: string) => {
    map.on("mouseenter", layer, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
  };
  hover("quake-hit");
  hover("typhoon-hit");
  map.on("click", "quake-hit", (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const quake = feature ? byQuake.get(String(feature.properties.id)) : null;
    if (!quake) return;
    context.openPopup(
      [quake.longitude, quake.latitude],
      quakePopup(quake, context.language(), Date.now()),
    );
  });
  map.on("click", "typhoon-hit", (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const cyclone = byCyclone.get(String(feature.properties.cyclone));
    if (!cyclone) return;
    const kind = feature.properties.kind as "past" | "current" | "forecast";
    const list = kind === "forecast" ? cyclone.forecast : cyclone.past;
    const fix = list[Number(feature.properties.at)];
    if (!fix) return;
    context.openPopup(
      [fix.longitude, fix.latitude],
      fixPopup(cyclone, fix, kind, context.language(), Date.now()),
    );
  });

  const setVisibility = (ids: string[], visible: boolean) => {
    for (const id of ids)
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  };
  const clearLabels = () => {
    labels.forEach((marker) => marker.remove());
    labels = [];
  };

  // Hidden until the first update says otherwise, so nothing flashes up.
  setVisibility(quakeLayerIds, false);
  setVisibility(typhoonLayerIds, false);
  const fitTo = (cyclones: Cyclone[]) => {
    const bounds = new maplibregl.LngLatBounds(
      TAIWAN_BOUNDS[0],
      TAIWAN_BOUNDS[1],
    );
    for (const cyclone of cyclones)
      for (const fix of [
        ...cyclone.past,
        ...(cyclone.current ? [cyclone.current] : []),
        ...cyclone.forecast,
      ])
        bounds.extend([fix.longitude, fix.latitude]);
    map.fitBounds(bounds, {
      padding: context.padding(),
      maxZoom: 7,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 700,
    });
  };
  return {
    update(next) {
      const quakes = next.data?.earthquakes.events ?? [];
      const cyclones = next.data?.typhoon.cyclones ?? [];
      byQuake.clear();
      for (const quake of quakes) byQuake.set(quake.id, quake);
      byCyclone.clear();
      for (const cyclone of cyclones) byCyclone.set(cyclone.id, cyclone);
      (map.getSource("quakes") as GeoJSONSource).setData(quakeFeatures(quakes));
      const shapes = cycloneFeatures(cyclones);
      (map.getSource("typhoon-areas") as GeoJSONSource).setData(shapes.areas);
      (map.getSource("typhoon-tracks") as GeoJSONSource).setData(shapes.tracks);
      (map.getSource("typhoon-fixes") as GeoJSONSource).setData(shapes.fixes);
      setVisibility(quakeLayerIds, next.quakesVisible);
      setVisibility(typhoonLayerIds, next.typhoonVisible);
      // Frame Taiwan and the storm together once per switch-on or new storm,
      // not on every refresh, so panning around is never undone.
      if (!next.typhoonVisible || cyclones.length === 0) {
        if (!next.typhoonVisible) fittedFor = null;
      } else {
        const key = cyclones
          .map((cyclone) => cyclone.id)
          .sort()
          .join(",");
        if (key !== fittedFor) {
          fittedFor = key;
          fitTo(cyclones);
        }
      }
      // The basemap has no font files, so the name is a plain DOM label that
      // ignores the pointer and leaves clicks to the map underneath.
      clearLabels();
      if (next.typhoonVisible)
        for (const cyclone of cyclones) {
          const current = cyclone.current;
          if (!current) continue;
          const element = document.createElement("div");
          element.className = "typhoon-label";
          element.textContent = cycloneName(cyclone, context.language());
          element.setAttribute("aria-hidden", "true");
          labels.push(
            new maplibregl.Marker({
              element,
              anchor: "bottom",
              offset: [0, -14],
            })
              .setLngLat([current.longitude, current.latitude])
              .addTo(map),
          );
        }
    },
    focus(target) {
      const quake = target.kind === "quake" ? byQuake.get(target.id) : null;
      const cyclone =
        target.kind === "cyclone" ? byCyclone.get(target.id) : null;
      const position = quake
        ? { longitude: quake.longitude, latitude: quake.latitude }
        : cyclone?.current;
      if (!position) return;
      const at: [number, number] = [position.longitude, position.latitude];
      map.easeTo({
        center: at,
        zoom: Math.max(map.getZoom(), cyclone ? 5.5 : 7),
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 700,
      });
      context.openPopup(
        at,
        quake
          ? quakePopup(quake, context.language(), Date.now())
          : fixPopup(
              cyclone!,
              cyclone!.current!,
              "current",
              context.language(),
              Date.now(),
            ),
      );
    },
    dispose() {
      clearLabels();
    },
  };
}
