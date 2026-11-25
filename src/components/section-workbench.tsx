"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Info,
  Link2,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  AtlasFeature,
  AtlasOverlay,
  AtlasResult,
  AtlasSection,
} from "@/lib/atlas-types";
import type { Freshness } from "@/lib/types";
import { buildChoropleth, subjectRamps } from "@/lib/choropleth";
import { tileKey } from "@/lib/atlas-tiles";
import { peoplesOfLabel } from "@/content/peoples-index";
import { speciesLabel, speciesShortName } from "@/content/species-info";
import { sectionGuides } from "@/content/section-guides";
import type { OutlineFile } from "@/lib/outline-map";
import { WildlifeCountyPanel } from "./wildlife/county-panel";
import { PhotoThumb } from "./photo-thumb";
import {
  countyLabelSpots,
  countyLabels as buildCountyLabels,
  countyTints,
} from "@/lib/wildlife-map";
import { SectionGuide } from "./section-guide";
import { CityCoverage } from "./city-coverage";
import { islandPath, islandViewBox } from "@/lib/island-path";
import {
  aqiBarForValue,
  aqiColours,
  aqiStatusEnglish,
  aqiTints,
} from "@/lib/transform";
import { ContinuousTabs } from "./watermelon/continuous-tabs";
import { useCounties, useLanguage } from "./providers";
import {
  atlasFetcher,
  emptyAtlas,
  sectionColors,
  useAtlasCatalogue,
} from "./atlas-hooks";
import { Status, useFormatTime } from "./status";
import { lessonsFor, trackLabel } from "@/content/lesson-index";
import { Footer } from "./footer";
import "./section-workbench.css";

/** Wildlife records are filed under scientific names only; show the name
 *  people actually use, with the scientific name kept beside it. */
function recordName(
  p: AtlasFeature["properties"],
  language: "en" | "zh",
): string {
  if (typeof p.scientificName === "string")
    return speciesShortName(p.scientificName, language);
  return language === "zh" && p.titleZh ? p.titleZh : p.title;
}
function recordAlias(
  p: AtlasFeature["properties"],
  language: "en" | "zh",
): string | null {
  if (typeof p.scientificName !== "string") return null;
  const label = speciesLabel(p.scientificName, language);
  return label === p.scientificName ? null : label;
}

const MapCanvas = dynamic(() => import("./map/map-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map / 載入地圖</div>,
});
const AtlasCharts = dynamic(() => import("./atlas-charts"), {
  loading: () => <p>Loading charts / 載入圖表</p>,
});
const headings = {
  environment: {
    en: "Our shared environment.",
    zh: "我們共有的環境。",
    description: [
      "Read the measurements behind the map: air quality, weather and laboratory-tested river samples.",
      "從地圖看見測量：空氣品質、氣象與實驗室檢測的河川採樣。",
    ],
  },
  forests: {
    en: "A changing landscape.",
    zh: "變遷中的地景。",
    description: [
      "Explore the published 2023 land-cover classification and its county statistics. Keep classification, coverage and evidence in view.",
      "探索公開的 2023 土地覆蓋分類與縣市統計，同時理解分類、涵蓋範圍及證據。",
    ],
  },
  wildlife: {
    en: "Life along the roads.",
    zh: "道路旁的生命。",
    description: [
      "Explore a conservation-screened subset of the 2011–2017 roadkill archive. Public map positions are generalized grid centres, not sighting locations.",
      "探索 2011–2017 路死典藏中經保育篩檢的子集。公開地圖位置為概化格網中心，並非實際發現點。",
    ],
  },
  culture: {
    en: "People and place.",
    zh: "人與地方。",
    description: [
      "Follow public village reference points, source-listed names and groups, historical studies and public trail routes.",
      "探索公開部落定位點、來源所列名稱與族群、歷史研究及公開古道路線。",
    ],
  },
  urban: {
    en: "Greener everyday spaces.",
    zh: "更綠的日常空間。",
    description: [
      "Locate Taipei parks and public trees, then inspect measured station air temperatures. Each inventory keeps its own geographical coverage and survey dates.",
      "尋找臺北公園與公共樹木，再檢視測站實測氣溫。各盤點保留自身地理範圍與調查日期。",
    ],
  },
};
/** Wildlife opens on the soft density surface: its positions are 10 km grid
 *  cells, and a smooth surface is the gentlest honest way to show them. The
 *  exact squares are one choice away. */
const defaultModes: Partial<Record<AtlasSection, "points" | "density">> = {
  wildlife: "density",
};
const defaults: Record<AtlasSection, string> = {
  environment: "live-aqi",
  forests: "landcover-2023",
  wildlife: "wildlife",
  culture: "villages",
  urban: "taipei-parks",
};
type Filters = {
  county: string;
  q: string;
  category: string;
  species: string;
  start: string;
  end: string;
  period: string;
  offset: number;
};
const knownMetrics = new Set([
  "aqi",
  "pm25",
  "pm10",
  "temperature",
  "humidity",
  "rainfall",
  "windSpeed",
  "windDirection",
  "do",
  "bod",
  "ss",
  "nh3n",
  "rpi",
  "forestAreaKm2",
  "forestShareMappedPct",
  "mappedCoveragePct",
  "areaM2",
  "heightM",
  "diameterCm",
]);

const subjects: {
  key: AtlasSection | "plants";
  label: [string, string];
}[] = [
  { key: "environment", label: ["Environment", "環境"] },
  { key: "forests", label: ["Forests", "森林"] },
  { key: "wildlife", label: ["Wildlife", "野生動物"] },
  { key: "plants", label: ["Plants", "植物"] },
  { key: "culture", label: ["Culture", "文化"] },
  { key: "urban", label: ["City", "城市"] },
];
const COUNTY_PREVIEW = 7;

export function SectionWorkbench({ section }: { section: AtlasSection }) {
  const formatTime = useFormatTime();
  const { language, t } = useLanguage(),
    search = useSearchParams(),
    tabId = useId();
  const catalogue = useAtlasCatalogue(),
    { counties, boundaryError, retryBoundaries } = useCounties();
  // Every choice below can arrive in the link, so a map view can be shared.
  const [chosen, setChosen] = useState<string | null>(null),
    [chosenMetric, setChosenMetric] = useState<string | null>(() => {
      const raw = search.get("metric");
      return raw === null ? null : raw === "none" ? "" : raw;
    });
  const [tab, setTab] = useState<"records" | "charts" | "sources">(() => {
      const raw = search.get("tab");
      return raw === "charts" || raw === "sources" ? raw : "records";
    }),
    [mode, setMode] = useState<"points" | "density">(() => {
      const raw = search.get("mode");
      return raw === "density" || raw === "points"
        ? raw
        : defaultModes[section] || "points";
    }),
    // The roadkill page opens on a county map. The 10 km grid (squares and a
    // smoothed surface) is still there for anyone who wants it, and links saved
    // with a map mode keep opening on the grid.
    [wildView, setWildView] = useState<"counties" | "grid">(() =>
      search.get("view") === "grid" ||
      (search.get("view") === null && search.get("mode") !== null)
        ? "grid"
        : "counties",
    ),
    [allCounties, setAllCounties] = useState(false),
    [shadeChoice, setShadeChoice] = useState<boolean | null>(() => {
      const raw = search.get("shade");
      return raw === "1" ? true : raw === "0" ? false : null;
    }),
    [copied, setCopied] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    county: search.get("county") || "",
    q: search.get("q") || "",
    category: search.get("category") || "",
    species: search.get("species") || "",
    start: search.get("start") || "",
    end: search.get("end") || "",
    period: ["day", "month", "year"].includes(search.get("period") || "")
      ? (search.get("period") as string)
      : "month",
    offset: 0,
  });
  const [viewport, setViewport] = useState<{
    bbox: [number, number, number, number];
    zoom: number;
  } | null>(null);
  const [selected, setSelected] = useState<AtlasFeature | null>(null),
    [fly, setFly] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null),
    peekRef = useRef<HTMLElement>(null),
    focusPeek = useRef(false);
  const available = useMemo(
    () =>
      (catalogue.data?.datasets || []).filter(
        (dataset) =>
          dataset.section === section ||
          (section === "urban" && dataset.id === "live-weather"),
      ),
    [catalogue.data, section],
  );
  const requested = chosen || search.get("dataset") || defaults[section];
  const dataset =
    available.find((item) => item.id === requested) ||
    available.find((item) => item.status === "available");
  const metric =
    chosenMetric ??
    (dataset?.id === "live-aqi"
      ? "aqi"
      : dataset?.id === "live-weather"
        ? "temperature"
        : dataset?.id === "river-quality"
          ? "rpi"
          : section === "forests" && dataset?.status === "available"
            ? "forestShareMappedPct"
            : "");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== "" && value !== 0) params.set(key, String(value));
  if (metric) params.set("metric", metric);
  const countyView = section === "wildlife" && wildView === "counties";
  if (viewport && !countyView)
    params.set(
      "bbox",
      viewport.bbox.map((value) => value.toFixed(4)).join(","),
    );
  const query = dataset ? `/api/atlas/${dataset.id}?${params}` : null;
  const result = useSWR<AtlasResult>(query, atlasFetcher, {
    dedupingInterval: 30000,
    shouldRetryOnError: false,
  });
  // The county navigator must keep listing every county after one is chosen,
  // so it asks for totals without the county, viewport or paging filters.
  const summaryParams = new URLSearchParams({ summary: "1" });
  for (const [key, value] of Object.entries(filters))
    if (
      !["county", "offset", "period"].includes(key) &&
      value !== "" &&
      value !== 0
    )
      summaryParams.set(key, String(value));
  if (metric) summaryParams.set("metric", metric);
  const summary = useSWR<AtlasResult>(
    dataset ? `/api/atlas/${dataset.id}?${summaryParams}` : null,
    atlasFetcher,
    {
      dedupingInterval: 30000,
      shouldRetryOnError: false,
      keepPreviousData: true,
    },
  );
  const speciesIndex = useSWRImmutable<{
    species: { id: string; name: string; count: number }[];
  }>(
    section === "wildlife" ? "/data/atlas/wildlife.species.json" : null,
    atlasFetcher,
  );
  const outlines = useSWRImmutable<OutlineFile>(
    countyView ? "/data/county-outlines.json" : null,
    atlasFetcher,
  );
  const culturalStudies = useSWRImmutable<
    | {
        profiles?: { id: string; title: string; titleZh: string }[];
        trails?: { id: string; title: string; titleZh: string }[];
      }
    | { id: string; title: string; titleZh: string }[]
  >(
    section === "culture" ? "/data/atlas/cultural-trails.json" : null,
    atlasFetcher,
  );
  const studies = culturalStudies.data
    ? Array.isArray(culturalStudies.data)
      ? culturalStudies.data
      : culturalStudies.data.profiles || culturalStudies.data.trails || []
    : [];
  const countyNames = useMemo(
    () =>
      Object.fromEntries(
        (counties?.features || []).map((feature) => [
          feature.properties.COUNTYCODE,
          language === "en"
            ? feature.properties.COUNTYENG
            : feature.properties.COUNTYNAME,
        ]),
      ),
    [counties, language],
  );
  const focusedAtlas = useMemo(
    () =>
      selected && dataset
        ? { datasetId: dataset.id, feature: selected, fly }
        : null,
    [selected, dataset, fly],
  );
  const onViewport = useCallback(
    (next: { bbox: [number, number, number, number]; zoom: number }) => {
      setViewport((current) =>
        current &&
        current.bbox.map((n) => n.toFixed(4)).join() ===
          next.bbox.map((n) => n.toFixed(4)).join()
          ? current
          : next,
      );
      setFilters((current) =>
        current.offset ? { ...current, offset: 0 } : current,
      );
    },
    [],
  );
  useEffect(() => {
    if (!selected || !focusPeek.current) return;
    focusPeek.current = false;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stageRef.current?.scrollIntoView({
      block: "start",
      behavior: calm ? "auto" : "smooth",
    });
    peekRef.current?.focus({ preventScroll: true });
  }, [selected]);
  const change = (key: keyof Filters, value: string) => {
    setSelected(null);
    setFilters((current) => ({ ...current, [key]: value, offset: 0 }));
  };
  const choose = (id: string) => {
    setChosen(id);
    setChosenMetric(null);
    setSelected(null);
    setFilters({
      county: "",
      q: "",
      category: "",
      species: "",
      start: "",
      end: "",
      period: "month",
      offset: 0,
    });
  };
  const viewRecord = (record: AtlasFeature) => {
    focusPeek.current = true;
    setFly(true);
    setSelected(record);
  };
  const valueText = (value: unknown) =>
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
        ? value
          ? t("Yes", "是")
          : t("No", "否")
        : typeof value === "number"
          ? value.toLocaleString(language === "en" ? "en" : "zh-TW", {
              maximumFractionDigits: 3,
            })
          : String(value);
  const metricField = dataset?.fields.find((field) => field.key === metric);
  const metricLabel = metricField
    ? `${metricField.label[language]}${metricField.unit ? ` (${metricField.unit})` : ""}`
    : "";
  const numericFields =
    dataset?.fields.filter(
      (field) =>
        knownMetrics.has(field.key) ||
        result.data?.records.some(
          (record) => typeof record.properties[field.key] === "number",
        ),
    ) || [];
  const species = speciesIndex.data?.species || result.data?.species || [];
  const title = headings[section];
  const live =
    !!dataset &&
    (dataset.id.startsWith("live-") || dataset.id === "river-quality");
  const unavailable = dataset?.status === "unavailable";
  const stationLayer =
    dataset?.id === "live-aqi" || dataset?.id === "live-weather";

  // County navigator: ranked by the chosen measurement, otherwise by record count.
  const countyList = useMemo(() => {
    const rows = (summary.data?.counties || []).map((item) => ({
      ...item,
      name: countyNames[item.code] || item.code,
    }));
    const byValue = !!metric && rows.some((row) => row.value !== null);
    rows.sort((a, b) => {
      if (!byValue) return b.count - a.count || a.name.localeCompare(b.name);
      if (a.value === null && b.value === null) return b.count - a.count;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value;
    });
    const top = Math.max(
      0,
      ...rows.map((row) => (byValue ? (row.value ?? 0) : row.count)),
    );
    return { rows, byValue, top };
  }, [summary.data?.counties, countyNames, metric]);
  const shownCounties = allCounties
    ? countyList.rows
    : countyList.rows.filter(
        (row, index) => index < COUNTY_PREVIEW || row.code === filters.county,
      );
  const choropleth = useMemo(
    () =>
      dataset && dataset.status !== "unavailable"
        ? buildChoropleth(countyList.rows, section, {
            aqi: dataset.id === "live-aqi" && metric === "aqi",
          })
        : null,
    [countyList.rows, dataset, section, metric],
  );
  // The same request again, but it keeps the last answer on screen while a new
  // county loads, so the list of animals does not blink empty between clicks.
  const steady = useSWR<AtlasResult>(countyView ? query : null, atlasFetcher, {
    dedupingInterval: 30000,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });
  // The county view hangs a count inside each county of the standard map.
  const labelSpots = useMemo(
    () => (outlines.data ? countyLabelSpots(outlines.data) : null),
    [outlines.data],
  );
  const countyTint = useMemo(
    () => (countyView ? countyTints(countyList.rows, choropleth) : null),
    [countyView, countyList.rows, choropleth],
  );
  const countyCountLabels = useMemo(
    () =>
      countyView
        ? buildCountyLabels(countyList.rows, labelSpots, (value) =>
            value.toLocaleString(language === "en" ? "en" : "zh-TW"),
          )
        : [],
    [countyView, countyList.rows, labelSpots, language],
  );
  const mapFeatures = result.data?.collection.features;
  const hasTiles = !!mapFeatures?.some(
    (feature) => feature.properties.x0 != null,
  );
  // Image datasets start on the image, and so do datasets drawn as count
  // tiles (tiles already show where records fall, so a second count shading
  // would only repeat them). Every other dataset starts shaded.
  const shadeOn =
    !!choropleth &&
    (shadeChoice ?? (!dataset?.raster && !!result.data && !hasTiles));
  const tiles = useMemo(
    () => (mapFeatures ? tileKey(mapFeatures, section, shadeOn) : null),
    [mapFeatures, section, shadeOn],
  );
  // The smoothed surface is what is drawn below zoom 9; squares fade in after.
  const softSurface = mode === "density" && (viewport?.zoom ?? 0) < 9;
  const stackCount = useMemo(
    () =>
      mapFeatures?.filter(
        (feature) =>
          feature.properties.aggregated && feature.properties.x0 == null,
      ).length ?? 0,
    [mapFeatures],
  );
  const overlays = useMemo<AtlasOverlay[]>(
    () =>
      dataset && !countyView && !(shadeOn && dataset.raster)
        ? [
            {
              dataset: result.data?.dataset || dataset,
              data: result.data?.collection || emptyAtlas,
              color: sectionColors[dataset.section],
              mode,
              colorBy:
                dataset.id === "live-aqi" && metric === "aqi"
                  ? ("aqi" as const)
                  : shadeOn
                    ? ("ink" as const)
                    : undefined,
            },
          ]
        : [],
    [
      dataset,
      result.data?.dataset,
      result.data?.collection,
      mode,
      metric,
      shadeOn,
      countyView,
    ],
  );
  const fmtNum = (value: number) =>
    Number(
      value.toFixed(Math.abs(value) < 10 && !Number.isInteger(value) ? 1 : 0),
    ).toLocaleString(language === "en" ? "en" : "zh-TW");
  useEffect(() => {
    if (!dataset) return;
    const next = new URLSearchParams();
    if (dataset.id !== defaults[section]) next.set("dataset", dataset.id);
    if (filters.county) next.set("county", filters.county);
    if (filters.q) next.set("q", filters.q);
    if (filters.species) next.set("species", filters.species);
    if (filters.category) next.set("category", filters.category);
    if (filters.start) next.set("start", filters.start);
    if (filters.end) next.set("end", filters.end);
    if (filters.period !== "month") next.set("period", filters.period);
    if (chosenMetric !== null) next.set("metric", chosenMetric || "none");
    if (section === "wildlife" && wildView === "grid") next.set("view", "grid");
    if (mode !== (defaultModes[section] || "points")) next.set("mode", mode);
    if (tab !== "records") next.set("tab", tab);
    if (shadeChoice !== null) next.set("shade", shadeChoice ? "1" : "0");
    const qs = next.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (
      url !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    )
      window.history.replaceState(null, "", url);
  }, [
    dataset,
    section,
    filters,
    chosenMetric,
    mode,
    tab,
    shadeChoice,
    wildView,
  ]);
  const copyLink = async () => {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const box = document.createElement("textarea");
      box.value = href;
      box.setAttribute("readonly", "");
      box.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(box);
      box.select();
      try {
        document.execCommand("copy");
      } catch {
        /* the address bar still holds the same link */
      }
      box.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };
  const extraFilters =
    (filters.start ? 1 : 0) +
    (filters.end ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (chosenMetric !== null ? 1 : 0) +
    (filters.period !== "month" ? 1 : 0);

  // One short list for the map card; every field stays under "All fields".
  const recordRows = (feature: AtlasFeature) => {
    const p = feature.properties;
    const rows: { key: string; label: string; value: string; note?: string }[] =
      [
        {
          key: "id",
          label: t("Original identifier", "原始編號"),
          value: valueText(p.id),
        },
        {
          key: "source",
          label: t("Source", "來源"),
          value: valueText(p.sourceId),
        },
        {
          key: "date",
          label:
            dataset?.id === "river-quality"
              ? t("Sampling date", "採樣日期")
              : dataset?.id.startsWith("live-")
                ? t("Observation time", "觀測時間")
                : t("Record date", "紀錄日期"),
          value: valueText(p.date),
        },
      ];
    if (live)
      rows.push({
        key: "published",
        label: t("Publication time", "發布時間"),
        value: p.publishedAt
          ? valueText(p.publishedAt)
          : t("Not supplied by this source record", "此來源紀錄未提供"),
      });
    for (const field of dataset?.fields || []) {
      const raw = p[field.key];
      rows.push({
        key: field.key,
        label: field.label[language],
        value:
          valueText(raw) +
          (raw !== null && raw !== undefined && field.unit
            ? ` ${field.unit}`
            : ""),
        note:
          dataset?.id === "river-quality" &&
          raw === null &&
          p[`${field.key}Raw`]
            ? `${t("Source: ", "來源：")}${valueText(p[`${field.key}Raw`])} ${valueText(p[`${field.key}Unit`])}`
            : undefined,
      });
    }
    return rows;
  };
  const stackMembers = useMemo(() => {
    const raw = selected?.properties.members;
    if (typeof raw !== "string") return [];
    try {
      const list = JSON.parse(raw) as {
        t: string;
        z: string | null;
        id: string;
        n: number;
        e?: string;
        s?: string;
      }[];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, [selected]);
  const peekFacts = (feature: AtlasFeature) => {
    const p = feature.properties;
    const facts: { label: string; value: string }[] = [];
    const county = countyNames[p.countyCode || ""];
    if (county) facts.push({ label: t("County", "縣市"), value: county });
    if (p.date)
      facts.push({
        label: live ? t("Observed", "觀測") : t("Date", "日期"),
        value: valueText(p.date),
      });
    const fields = [
      ...(dataset?.fields.filter((field) => field.key === metric) || []),
      ...(dataset?.fields.filter((field) => field.key !== metric) || []),
    ];
    for (const field of fields) {
      if (facts.length >= 4) break;
      const raw = p[field.key];
      if (raw === null || raw === undefined || raw === "") continue;
      facts.push({
        label: field.label[language],
        value: valueText(raw) + (field.unit ? ` ${field.unit}` : ""),
      });
    }
    return facts;
  };

  return (
    <main
      id="main"
      className="document-page atlas-workbench"
      data-dataset={dataset?.id || ""}
      data-subject={section}
    >
      <header className="atlas-head">
        <div className="atlas-head-copy">
          <h1>{title[language]}</h1>
          <p>{title.description[language === "en" ? 0 : 1]}</p>
          {section === "culture" && (
            <Link className="atlas-head-link" href="/culture/peoples">
              {t("Meet the sixteen peoples", "認識十六個族群")} →
            </Link>
          )}
          {section === "environment" && (
            <Link className="atlas-head-link" href="/environment/air-over-time">
              {t("Has the air improved? 2013–2025", "空氣有變好嗎？2013–2025")}{" "}
              →
            </Link>
          )}
        </div>
        <nav
          className="atlas-section-nav"
          aria-label={t("Atlas subjects", "地圖專題")}
        >
          {subjects.map((item) => (
            <Link
              key={item.key}
              href={`/${item.key}`}
              data-tone={item.key}
              aria-current={item.key === section ? "page" : undefined}
            >
              {item.label[language === "en" ? 0 : 1]}
            </Link>
          ))}
          <Link href="/explore" className="atlas-nav-all">
            {t("All layers", "全部圖層")} ↗
          </Link>
        </nav>
        <svg
          className="atlas-head-island"
          viewBox={islandViewBox}
          aria-hidden="true"
          focusable="false"
        >
          <path d={islandPath} />
        </svg>
      </header>
      <SectionGuide guide={sectionGuides[section]} />
      {section === "urban" && <CityCoverage />}
      {catalogue.error && (
        <div className="atlas-notice" role="alert">
          <p>
            {t(
              "The source catalogue is unavailable. Retry the connection.",
              "來源目錄無法取得，請重試連線。",
            )}
          </p>
          <button
            className="button secondary"
            onClick={() => void catalogue.mutate()}
          >
            {t("Retry", "重試")}
          </button>
        </div>
      )}
      {result.error && (
        <div className="atlas-notice" role="alert">
          <p>
            {t(
              "These data could not be loaded. The other sections and official boundary map remain available.",
              "無法載入本資料，其他專題及官方界線地圖仍可使用。",
            )}
          </p>
          <button
            className="button secondary"
            onClick={() => void result.mutate()}
          >
            {t("Retry data", "重試資料")}
          </button>
        </div>
      )}
      <div className="atlas-stage" ref={stageRef} id="atlas-stage">
        <div
          className={`atlas-stat-strip${countyView ? " atlas-stat-strip-3" : ""}`}
          aria-live="polite"
        >
          <div>
            <span>{t("Matching records", "符合紀錄")}</span>
            <strong>
              {result.data ? result.data.total.toLocaleString() : "—"}
            </strong>
          </div>
          {!countyView && (
            <div>
              <span>{t("In current map view", "目前地圖範圍內")}</span>
              <strong>
                {result.data ? result.data.inViewport.toLocaleString() : "—"}
              </strong>
            </div>
          )}
          <div>
            <span>{t("Included record dates", "收錄資料日期")}</span>
            <strong className="atlas-date-stat">
              {result.data?.dateRange?.join(" → ") ||
                t("Undated inventory", "無日期盤點")}
            </strong>
          </div>
          <div>
            <span>{t("Source state", "來源狀態")}</span>
            <span className="atlas-state">
              <Status
                loading={result.isLoading}
                status={
                  (result.data?.status === "available"
                    ? "historical-only"
                    : result.data?.status || "unavailable") as Freshness
                }
              />
              {result.data?.retrievedAt && (
                <small>
                  {live
                    ? `${t("Retrieved ", "擷取 ")}${formatTime(result.data.retrievedAt)}${t(" (Taiwan time)", "（臺灣時間）")}`
                    : `${t("Catalogue date ", "目錄日期 ")}${result.data.retrievedAt.slice(0, 10)}`}
                </small>
              )}
            </span>
          </div>
        </div>
        <section
          className="atlas-controls"
          aria-label={t("Choose what to show", "選擇顯示內容")}
        >
          <label>
            <span>{t("Dataset", "資料集")}</span>
            <select
              aria-label={t("Dataset", "資料集")}
              value={dataset?.id || ""}
              onChange={(event) => choose(event.target.value)}
            >
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title[language]}
                  {item.status === "unavailable"
                    ? ` · ${t("unavailable", "尚無資料")}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("County", "縣市")}</span>
            <select
              aria-label={t("County", "縣市")}
              value={filters.county}
              onChange={(event) => change("county", event.target.value)}
            >
              <option value="">
                {t("All Taiwan & offshore islands", "全臺灣與離島")}
              </option>
              {Object.entries(countyNames).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Search records", "搜尋紀錄")}</span>
            <input
              aria-label={t("Search records", "搜尋紀錄")}
              value={filters.q}
              onChange={(event) => change("q", event.target.value)}
              placeholder={t(
                "Name, group, river or identifier",
                "名稱、族群、河川或編號",
              )}
            />
          </label>
          {!!species.length && (
            <label>
              <span>{t("Species", "物種")}</span>
              <select
                aria-label={t("Species", "物種")}
                value={filters.species}
                onChange={(event) => change("species", event.target.value)}
              >
                <option value="">
                  {t("All included species", "所有收錄物種")}
                </option>
                {species.map((item) => (
                  <option key={item.id} value={item.id}>
                    {speciesLabel(item.name, language)} ({item.count})
                  </option>
                ))}
              </select>
            </label>
          )}
          <details className="atlas-more">
            <summary>
              {t("More filters", "更多篩選")}
              {extraFilters > 0 && (
                <span className="atlas-count">{extraFilters}</span>
              )}
            </summary>
            <div className="atlas-more-grid">
              {!!result.data?.categories.length && (
                <label>
                  <span>{t("Category", "類別")}</span>
                  <select
                    aria-label={t("Category", "類別")}
                    value={filters.category}
                    onChange={(event) => change("category", event.target.value)}
                  >
                    <option value="">{t("All categories", "所有類別")}</option>
                    {result.data.categories.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} ({item.count})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(dataset?.dateRange || live) && (
                <>
                  <label>
                    <span>{t("Start date", "起始日期")}</span>
                    <input
                      aria-label={t("Start date", "起始日期")}
                      type="date"
                      value={filters.start}
                      onChange={(event) => change("start", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>{t("End date", "結束日期")}</span>
                    <input
                      aria-label={t("End date", "結束日期")}
                      type="date"
                      value={filters.end}
                      onChange={(event) => change("end", event.target.value)}
                    />
                  </label>
                </>
              )}
              <label>
                <span>{t("Metric", "指標")}</span>
                <select
                  aria-label={t("Metric", "指標")}
                  value={metric}
                  onChange={(event) => setChosenMetric(event.target.value)}
                >
                  <option value="">{t("Record count", "紀錄數")}</option>
                  {numericFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label[language]}
                      {field.unit ? ` (${field.unit})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("Aggregation", "時間彙整")}</span>
                <select
                  aria-label={t("Aggregation", "時間彙整")}
                  value={filters.period}
                  onChange={(event) => change("period", event.target.value)}
                >
                  <option value="day">{t("Daily", "每日")}</option>
                  <option value="month">{t("Monthly", "每月")}</option>
                  <option value="year">{t("Yearly", "每年")}</option>
                </select>
              </label>
              <button
                className="button secondary atlas-reset"
                onClick={() => choose(dataset?.id || defaults[section])}
              >
                <RefreshCw size={15} />
                {t("Reset filters", "重設篩選")}
              </button>
            </div>
          </details>
        </section>

        <div
          className={`atlas-map-pane${countyView ? " atlas-map-pane-flow" : ""}`}
        >
          <div className="atlas-map-toolbar">
            {section === "wildlife" && (
              <div
                className="atlas-view-switch"
                role="group"
                aria-label={t("Map view", "地圖檢視")}
              >
                <button
                  type="button"
                  aria-pressed={countyView}
                  onClick={() => {
                    setSelected(null);
                    setViewport(null);
                    setWildView("counties");
                  }}
                >
                  {t("By county", "依縣市")}
                </button>
                <button
                  type="button"
                  aria-pressed={!countyView}
                  onClick={() => {
                    setSelected(null);
                    setWildView("grid");
                  }}
                >
                  {t("10 km grid", "10 公里方格")}
                </button>
              </div>
            )}
            {countyView ? null : dataset?.raster ? (
              <span>
                {shadeOn
                  ? t(
                      "County statistics from source pixels",
                      "縣市統計（來源像素）",
                    )
                  : t(
                      "Raster overview · nearest-neighbour display",
                      "網格概覽・最近鄰呈現",
                    )}
              </span>
            ) : (
              <label>
                {t("Map display", "地圖呈現")}
                <select
                  aria-label={t("Map display", "地圖呈現")}
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as "points" | "density")
                  }
                >
                  <option value="points">
                    {section === "wildlife"
                      ? t("Exact squares & dots", "精確方格與點位")
                      : t("Points & routes", "點位與路線")}
                  </option>
                  <option value="density">
                    {section === "wildlife"
                      ? t("Soft density surface", "柔和密度圖")
                      : t("Density surface", "密度圖")}
                  </option>
                </select>
              </label>
            )}
            {choropleth && !countyView && (
              <label className="atlas-shade">
                <input
                  type="checkbox"
                  checked={shadeOn}
                  onChange={(event) => setShadeChoice(event.target.checked)}
                />
                {t("Shade counties", "縣市著色")}
              </label>
            )}
            <button
              type="button"
              className="atlas-share"
              onClick={() => void copyLink()}
            >
              {copied ? <Check size={15} /> : <Link2 size={15} />}
              {copied
                ? t("Link copied", "已複製連結")
                : t("Copy link to this view", "複製此檢視連結")}
            </button>
            <Link href={`/explore?layers=${dataset?.id || ""}`}>
              {t("Open central atlas", "開啟中央地圖")} ↗
            </Link>
          </div>
          <div className="atlas-map">
            {counties ? (
              <MapCanvas
                compact
                externalInspector
                counties={counties}
                selectedCounty={filters.county}
                countyTint={
                  countyView ? countyTint : shadeOn ? choropleth?.tint : null
                }
                countyLabels={countyView ? countyCountLabels : undefined}
                boundariesVisible
                aqi={[]}
                weather={[]}
                aqiVisible={false}
                weatherVisible={false}
                focusedObservation={null}
                aqiRetrievedAt={null}
                weatherRetrievedAt={null}
                language={language}
                resetToken={0}
                onSelect={(code) => change("county", code)}
                overlays={overlays}
                onViewport={onViewport}
                focusedAtlas={focusedAtlas}
                onAtlasSelect={(_, feature) => {
                  setFly(false);
                  setSelected(feature);
                }}
              />
            ) : (
              <div className="map-loading">
                {boundaryError ? (
                  <button
                    className="button secondary"
                    onClick={retryBoundaries}
                  >
                    {t("Retry official boundaries", "重試官方界線")}
                  </button>
                ) : (
                  t("Loading official county boundaries…", "載入官方縣市界線…")
                )}
              </div>
            )}
            {!countyView &&
              selected &&
              dataset &&
              selected.properties.aggregated && (
                <section
                  id="atlas-record-details"
                  className="atlas-peek"
                  aria-label={t("Selected map spot", "選取的地圖位置")}
                  tabIndex={-1}
                  ref={peekRef}
                >
                  <div className="atlas-peek-head">
                    <div>
                      <span className="atlas-peek-kind">
                        {dataset.title[language]}
                      </span>
                      <h2>
                        {selected.properties.x0 != null
                          ? language === "zh"
                            ? `此方格有 ${Number(selected.properties.count || 0).toLocaleString("zh-TW")} 筆紀錄`
                            : `${Number(selected.properties.count || 0).toLocaleString("en")} records in this square`
                          : language === "zh"
                            ? `此處有 ${Number(selected.properties.count || 0).toLocaleString("zh-TW")} 筆紀錄`
                            : `${Number(selected.properties.count || 0).toLocaleString("en")} records at this spot`}
                      </h2>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={t("Close record details", "關閉紀錄詳情")}
                      onClick={() => setSelected(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="atlas-peek-text">
                    {selected.properties.x0 != null
                      ? t(
                          `The source publishes positions only as cells about ${Number(selected.properties.cellKm || 10)} km wide, so this square stands for every record inside it. It is a count, not the place where any one thing happened.`,
                          `來源只公開約 ${Number(selected.properties.cellKm || 10)} 公里寬的網格位置，因此這個方格代表其中所有紀錄；它是數量，不是任何單一事件發生的地點。`,
                        )
                      : t(
                          "These records share one public map position, so they cannot be told apart on the map.",
                          "這些紀錄共用同一個公開地圖位置，無法在地圖上區分。",
                        )}
                  </p>
                  {stackMembers.length > 0 && (
                    <ul className="atlas-peek-members">
                      {stackMembers.map((member) => {
                        const name =
                          language === "zh"
                            ? member.z || member.e || member.t
                            : member.e || member.t;
                        const body = (
                          <>
                            {name}
                            {name !== member.t && <i> {member.t}</i>}
                          </>
                        );
                        return (
                          <li key={`${member.t}-${member.id}`}>
                            {section === "culture" ? (
                              <Link
                                href={`/culture/places/${encodeURIComponent(member.id)}`}
                              >
                                {language === "zh" && member.z
                                  ? member.z
                                  : member.t}
                              </Link>
                            ) : member.s ? (
                              <Link
                                href={`/wildlife/species/${encodeURIComponent(member.s)}`}
                              >
                                {body}
                              </Link>
                            ) : (
                              <span>{body}</span>
                            )}
                            {member.n > 1 && <b>{member.n.toLocaleString()}</b>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {Number(selected.properties.memberKinds || 0) >
                    stackMembers.length && (
                    <p className="atlas-peek-text">
                      {t(
                        `…and ${Number(selected.properties.memberKinds) - stackMembers.length} more kinds. All of them are in the list below.`,
                        `…另有 ${Number(selected.properties.memberKinds) - stackMembers.length} 種，皆列於下方列表。`,
                      )}
                    </p>
                  )}
                  <button
                    type="button"
                    className="atlas-more-toggle"
                    onClick={() => {
                      setTab("records");
                      document
                        .getElementById(`${tabId}-records-panel`)
                        ?.scrollIntoView({
                          block: "start",
                          behavior: "smooth",
                        });
                    }}
                  >
                    {t("Show them in the list", "在列表中查看")} ↓
                  </button>
                </section>
              )}
            {!countyView &&
              selected &&
              dataset &&
              !selected.properties.aggregated && (
                <section
                  id="atlas-record-details"
                  className="atlas-peek"
                  aria-label={t("Selected record", "選取的紀錄")}
                  tabIndex={-1}
                  ref={peekRef}
                >
                  <div className="atlas-peek-head">
                    <div>
                      <span className="atlas-peek-kind">
                        {dataset.title[language]}
                      </span>
                      <h2>{recordName(selected.properties, language)}</h2>
                      {recordAlias(selected.properties, language) && (
                        <p className="atlas-peek-alias">
                          {recordAlias(selected.properties, language)}
                        </p>
                      )}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={t("Close record details", "關閉紀錄詳情")}
                      onClick={() => setSelected(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <dl className="atlas-peek-facts">
                    {peekFacts(selected).map((fact) => (
                      <div key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {section === "culture" &&
                    peoplesOfLabel(selected.properties.group).map((people) => (
                      <div className="atlas-peek-people" key={people.slug}>
                        <strong>
                          {language === "zh" ? people.name.zh : people.name.en}
                        </strong>
                        <p>
                          {language === "zh" ? people.line.zh : people.line.en}
                        </p>
                        <Link
                          className="text-link"
                          href={`/culture/peoples/${people.slug}`}
                        >
                          {t(
                            `About the ${people.name.en}`,
                            `認識${people.name.zh}`,
                          )}{" "}
                          ↗
                        </Link>
                      </div>
                    ))}
                  <div className="atlas-peek-links">
                    {selected.properties.speciesId && (
                      <Link
                        className="text-link"
                        href={`/wildlife/species/${encodeURIComponent(String(selected.properties.speciesId))}`}
                      >
                        {t(
                          "Photos, description & records for this species",
                          "這個物種的照片、介紹與紀錄",
                        )}{" "}
                        ↗
                      </Link>
                    )}
                    {section === "culture" &&
                      !selected.properties.aggregated && (
                        <Link
                          className="atlas-peek-open"
                          href={`/culture/places/${encodeURIComponent(selected.properties.id)}`}
                        >
                          {t("Open the village profile", "開啟部落介紹")} →
                        </Link>
                      )}
                  </div>
                  <details className="atlas-peek-all">
                    <summary>
                      {t("All fields & source", "全部欄位與來源")}
                    </summary>
                    <dl>
                      {recordRows(selected).map((row) => (
                        <div key={row.key}>
                          <dt>{row.label}</dt>
                          <dd>
                            {row.value}
                            {row.note && <small> {row.note}</small>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <a
                      href={dataset.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("Original source", "原始來源")} ↗ · {dataset.licence}
                    </a>
                  </details>
                </section>
              )}
          </div>
          {(countyView || shadeOn) && choropleth && (
            <div
              className="atlas-choro"
              role="group"
              aria-label={t("County shading key", "縣市著色圖例")}
            >
              <strong>
                {choropleth.measured
                  ? `${t("County mean", "縣市平均")} · ${metricLabel}`
                  : t("Included records per county", "各縣市收錄紀錄數")}
              </strong>
              {choropleth.official && (
                <ol className="atlas-aqi-tints">
                  {Object.keys(aqiTints).map((band) => (
                    <li key={band}>
                      <i style={{ background: aqiTints[band].fill }} />
                      {language === "zh" ? band : aqiStatusEnglish[band]}
                    </li>
                  ))}
                </ol>
              )}
              {!choropleth.official && (
                <ol>
                  {choropleth.classes.map((item) => (
                    <li key={item.color}>
                      <i style={{ background: item.color }} />
                      {item.from === item.to
                        ? fmtNum(item.from)
                        : `${fmtNum(item.from)}–${fmtNum(item.to)}`}
                    </li>
                  ))}
                  {choropleth.missing > 0 && (
                    <li>
                      <i className="atlas-choro-none" />
                      {t("No data", "無資料")}
                    </li>
                  )}
                </ol>
              )}
              <p>
                {choropleth.official
                  ? t(
                      "Each county is tinted with a soft version of the official AQI colour for the mean of its stations' latest readings. The mean hides the spread between stations; the dots keep the full official colours.",
                      "各縣市以其測站最新讀數平均值對應官方 AQI 色系，並以柔和色調呈現；平均會掩蓋測站間的差異，測站圓點則保留完整官方顏色。",
                    )
                  : choropleth.measured
                    ? t(
                        "Five classes with about the same number of counties each. Counties with few records or stations give a less certain mean.",
                        "分為五級，每級縣市數大致相同。紀錄或測站少的縣市，平均值較不確定。",
                      )
                    : t(
                        "Counts, not rates: counties differ in size, population and survey effort, so a darker county is not necessarily a worse one.",
                        "此為數量而非比率：各縣市面積、人口與調查投入不同，顏色較深不代表情況較嚴重。",
                      )}
              </p>
            </div>
          )}
          {countyView && (
            <WildlifeCountyPanel
              outlines={outlines.data}
              rows={countyList.rows}
              selected={filters.county}
              onSelect={(code) => change("county", code)}
              animals={steady.data?.species ?? []}
              categories={steady.data?.categories ?? []}
              loading={!summary.data}
            />
          )}
          {!countyView && !dataset?.raster && (tiles || stackCount > 0) && (
            <div
              className="atlas-choro atlas-tiles"
              role="group"
              aria-label={t("Map marker key", "地圖標記圖例")}
            >
              {tiles && softSurface && (
                <>
                  <strong>
                    {t("Records nearby (smoothed)", "附近的紀錄數（已平滑）")}
                  </strong>
                  <span
                    className="atlas-ramp-bar"
                    style={{
                      background: `linear-gradient(90deg, ${subjectRamps[section].join(", ")})`,
                    }}
                    aria-hidden="true"
                  />
                  <span className="atlas-ramp-ends">
                    <span>{t("Fewer", "較少")}</span>
                    <span>{t("More", "較多")}</span>
                  </span>
                  <p>
                    {t(
                      `A soft surface blends neighbouring ${tiles.km} km squares, so edges between squares are not real boundaries. Zoom in to see the exact squares.`,
                      `柔和密度圖會融合相鄰的 ${tiles.km} 公里方格，方格之間的邊緣並非真實界線。放大即可看到精確方格。`,
                    )}
                  </p>
                </>
              )}
              {tiles && !softSurface && (
                <>
                  <strong>
                    {t(
                      `Records per square (each about ${tiles.km} km wide)`,
                      `每格紀錄數（每格約 ${tiles.km} 公里寬）`,
                    )}
                  </strong>
                  <ol>
                    {tiles.classes.map((item) => (
                      <li key={item.color}>
                        <i style={{ background: item.color }} />
                        {item.from === item.to
                          ? fmtNum(item.from)
                          : `${fmtNum(item.from)}–${fmtNum(item.to)}`}
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {stackCount > 0 && (
                <p>
                  <i className="atlas-stack-mark" />
                  {t(
                    "A hollow ring means several records share one public point; click it to list them.",
                    "空心圓環代表數筆紀錄共用同一個公開定位點，點擊即可列出。",
                  )}
                </p>
              )}
              {tiles && !softSurface && (
                <p>
                  {t(
                    "A square is a count of records in that area, not a place where one thing happened. Click a square to open it.",
                    "方格是該範圍內的紀錄數量，並非單一事件發生的位置。點擊方格即可展開。",
                  )}
                </p>
              )}
            </div>
          )}
          {countyView ? null : dataset?.raster ? (
            shadeOn ? null : (
              <div
                className="atlas-key atlas-raster-legend"
                aria-label={t("Land-cover legend", "土地覆蓋圖例")}
              >
                {dataset.raster.legend.map((item) => (
                  <span key={item.color}>
                    <i style={{ background: item.color }} />
                    {item.label[language]}
                  </span>
                ))}
              </div>
            )
          ) : (
            <p className="atlas-key">
              {dataset?.id === "live-aqi" && metric === "aqi" && (
                <span className="atlas-aqi-key">
                  {Object.keys(aqiColours).map((band) => (
                    <span key={band}>
                      <i style={{ background: aqiColours[band] }} />
                      {language === "zh" ? band : aqiStatusEnglish[band]}
                    </span>
                  ))}
                </span>
              )}
              <span>
                <i
                  className="atlas-key-dot"
                  style={{ background: sectionColors[section] }}
                />
                {stationLayer
                  ? t(
                      "Each circle is one monitoring station. Select it for its latest reading.",
                      "每個圓圈代表一個測站，點選可看最新讀數。",
                    )
                  : t(
                      "Bigger circle = more included records at that spot. Select one for details; zoom in to split it.",
                      "圓圈越大＝該處收錄紀錄越多。點選可看詳情，放大可拆分。",
                    )}
              </span>
            </p>
          )}
          {!countyView && (
            <p className="atlas-map-note">
              {dataset?.raster
                ? t(
                    "The overview is generalized for the map. County statistics use original source pixels; selecting a county retains the full research raster as geographic context.",
                    "地圖概覽經簡化；縣市統計使用原始像素。選取縣市後仍保留完整研究影像作地理參考。",
                  )
                : stationLayer
                  ? t(
                      "Readings are point measurements at stations, not area averages. Use two fingers or Ctrl + scroll to move and zoom the map.",
                      "讀數為測站點位實測，並非區域平均。以雙指或 Ctrl + 滾輪移動及縮放地圖。",
                    )
                  : t(
                      "Circles and density show included record counts, not abundance, incident risk or area coverage. Use two fingers or Ctrl + scroll to move and zoom the map.",
                      "圓圈與密度呈現收錄紀錄數，並非族群數量、事件風險或面積覆蓋。以雙指或 Ctrl + 滾輪移動及縮放地圖。",
                    )}
            </p>
          )}
        </div>

        <div className="atlas-browse">
          {countyList.rows.length > 0 && (
            <section
              className="atlas-counties"
              aria-labelledby={`${tabId}-counties`}
            >
              <div className="atlas-block-head">
                <h2 id={`${tabId}-counties`}>
                  {t("Browse by county", "依縣市瀏覽")}
                </h2>
                <span>
                  {countyList.byValue
                    ? `${t("Average", "平均")} · ${metricLabel}`
                    : t("Records", "紀錄數")}
                </span>
              </div>
              <ul>
                <li>
                  <button
                    type="button"
                    className="atlas-county-all"
                    aria-pressed={!filters.county}
                    onClick={() => change("county", "")}
                  >
                    {t("All Taiwan & offshore islands", "全臺灣與離島")}
                  </button>
                </li>
                {shownCounties.map((row) => {
                  const amount = countyList.byValue
                    ? (row.value ?? 0)
                    : row.count;
                  const bar =
                    dataset?.id === "live-aqi" &&
                    metric === "aqi" &&
                    row.value !== null
                      ? aqiBarForValue(row.value)
                      : (shadeOn || countyView) && choropleth?.tint[row.code]
                        ? choropleth.tint[row.code]
                        : "var(--accent)";
                  return (
                    <li key={row.code}>
                      <button
                        type="button"
                        aria-pressed={filters.county === row.code}
                        onClick={() => change("county", row.code)}
                      >
                        <span className="atlas-county-name">{row.name}</span>
                        <span className="atlas-county-num">
                          {countyList.byValue
                            ? row.value === null
                              ? "—"
                              : Number(row.value.toFixed(1)).toLocaleString()
                            : row.count.toLocaleString()}
                        </span>
                        <i
                          className="atlas-county-bar"
                          aria-hidden="true"
                          style={
                            {
                              "--w": `${countyList.top ? Math.max(2, (Math.max(0, amount) / countyList.top) * 100) : 0}%`,
                              "--bar": bar,
                            } as CSSProperties
                          }
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {countyList.rows.length > COUNTY_PREVIEW && (
                <button
                  type="button"
                  className="atlas-more-toggle"
                  onClick={() => setAllCounties((open) => !open)}
                >
                  {allCounties
                    ? t("Show fewer", "顯示較少")
                    : t(
                        `Show all ${countyList.rows.length} counties`,
                        `顯示全部 ${countyList.rows.length} 個縣市`,
                      )}
                </button>
              )}
            </section>
          )}
          {dataset && (
            <details
              className="atlas-scope"
              key={dataset.id}
              open={unavailable || undefined}
            >
              <summary>
                <Info size={15} />
                {t("About this data", "關於此資料")}
              </summary>
              <p>{dataset.limitation[language]}</p>
              {dataset.id === "river-quality" &&
                result.data?.sourceRows !== undefined && (
                  <p>
                    {t("Provider extract before filters: ", "篩選前來源擷取：")}
                    {result.data.sourceRows.toLocaleString()}
                    {t(
                      " indicator rows; grouped by station and sampling date.",
                      " 筆指標資料；依測站與採樣日期合併。",
                    )}
                  </p>
                )}
              {section === "forests" && (
                <p>
                  {t(
                    "The public archive contains a 2023 raster and a file labelled 2015; a verified 2013 baseline is not supplied. No 2013–2023 change or deforestation estimate is fabricated.",
                    "公開典藏含 2023 影像與標示為 2015 的檔案，未提供可確認的 2013 基準。本平台不捏造 2013–2023 變遷或毀林估計。",
                  )}
                </p>
              )}
            </details>
          )}
        </div>
      </div>

      <ContinuousTabs
        id={tabId}
        label={t("Subject views", "專題檢視")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "records" as const, label: t("Records", "紀錄") },
          {
            value: "charts" as const,
            label: t("Compare & charts", "比較與圖表"),
          },
          {
            value: "sources" as const,
            label: t("Sources & scope", "來源與範圍"),
          },
        ]}
      />
      <div
        role="tabpanel"
        id={`${tabId}-records-panel`}
        aria-labelledby={`${tabId}-records-tab`}
        hidden={tab !== "records"}
        className="atlas-tab-panel"
      >
        <div className="atlas-records-heading">
          <div>
            <h2>{t("Filtered records", "篩選後紀錄")}</h2>
            <p>
              {t(
                "Follows the map view. Missing measurements show as —.",
                "依目前地圖範圍顯示。缺少的測值以 — 顯示。",
              )}
            </p>
          </div>
          <div>
            {dataset && (
              <a
                className="button secondary"
                href={`/api/atlas/${dataset.id}?${new URLSearchParams([...params.entries()].filter(([key]) => key !== "bbox"))}&format=csv`}
              >
                <ArrowDownToLine size={15} />
                {t("Export CSV", "匯出 CSV")}
              </a>
            )}
            {dataset?.file && (
              <a className="text-link" href={dataset.file} download>
                {t("Full processed GeoJSON", "完整處理後 GeoJSON")} ↗
              </a>
            )}
          </div>
        </div>
        <p className="atlas-map-note">
          {t(
            "CSV follows the filters except the map view and holds up to 5,000 records; the full processed download keeps every published record.",
            "CSV 依地圖範圍以外的篩選條件匯出最多 5,000 筆，完整處理後下載則保留所有公開紀錄。",
          )}
        </p>
        <div className="atlas-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Record", "紀錄")}</th>
                <th>{t("County", "縣市")}</th>
                <th>{t("Date / year", "日期／年份")}</th>
                <th>
                  {metricField
                    ? metricField.label[language]
                    : t("Category", "類別")}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.data?.records.map((record) => (
                <tr key={record.properties.id}>
                  <td>
                    {record.properties.speciesId ? (
                      // An animal's name opens its page, with photos and what
                      // is known about it; the map is a secondary action.
                      <Link
                        className="atlas-record-link"
                        href={`/wildlife/species/${encodeURIComponent(String(record.properties.speciesId))}`}
                      >
                        <PhotoThumb
                          photoKey={String(
                            record.properties.scientificName ?? "",
                          )}
                          kind="animal"
                          size={36}
                          radius={6}
                        />
                        <span>{recordName(record.properties, language)}</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    ) : (
                      <button
                        aria-label={`${t("View", "檢視")} ${record.properties.title}`}
                        className="atlas-record-button"
                        onClick={() => viewRecord(record)}
                      >
                        {recordName(record.properties, language)}
                        <ArrowUpRight size={13} />
                      </button>
                    )}
                    {record.properties.speciesId && !countyView && (
                      <button
                        type="button"
                        className="atlas-profile-link"
                        onClick={() => viewRecord(record)}
                      >
                        {t("Show on map", "在地圖上查看")}
                      </button>
                    )}
                    {section === "culture" && (
                      <Link
                        className="atlas-profile-link"
                        href={`/culture/places/${encodeURIComponent(record.properties.id)}`}
                      >
                        {t("Place profile", "地點資料")}
                      </Link>
                    )}
                  </td>
                  <td>
                    {countyNames[record.properties.countyCode || ""] ||
                      t("Not assigned", "未指派")}
                  </td>
                  <td>{valueText(record.properties.date)}</td>
                  <td>
                    {valueText(
                      metric
                        ? record.properties[metric]
                        : record.properties.category,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result.isLoading && !result.data?.records.length && (
          <div className="atlas-empty">
            <Info />
            <h3>{t("No records in this selection", "此篩選範圍沒有紀錄")}</h3>
            <p>
              {unavailable && dataset
                ? dataset.limitation[language]
                : t(
                    "Try a different dataset, county, date window or map extent. Missing coverage is not a zero measurement.",
                    "請嘗試其他資料集、縣市、日期或地圖範圍。缺少涵蓋資料並不代表測值為零。",
                  )}
            </p>
          </div>
        )}
        {result.data?.nextOffset !== null &&
          result.data?.nextOffset !== undefined && (
            <button
              className="button secondary"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  offset: result.data!.nextOffset!,
                }))
              }
            >
              {t("Next records", "下一批紀錄")}
            </button>
          )}
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-charts-panel`}
        aria-labelledby={`${tabId}-charts-tab`}
        hidden={tab !== "charts"}
        className="atlas-tab-panel"
      >
        {tab === "charts" && result.data && (
          <AtlasCharts
            result={result.data}
            metric={metric}
            countyNames={countyNames}
          />
        )}
        {tab === "charts" && !result.data && (
          <p>
            {t(
              "Select an available dataset to inspect its actual coverage and charts.",
              "請選取可用資料集以檢視實際涵蓋範圍及圖表。",
            )}
          </p>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-sources-panel`}
        aria-labelledby={`${tabId}-sources-tab`}
        hidden={tab !== "sources"}
        className="atlas-tab-panel"
      >
        {dataset && (
          <article className="atlas-source-card">
            <span className="eyebrow">{dataset.sourceId}</span>
            <h2>{dataset.title[language]}</h2>
            <p>{dataset.description[language]}</p>
            <p>{dataset.limitation[language]}</p>
            <p>{dataset.licence}</p>
            <a
              className="text-link"
              href={dataset.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("Official source / research archive", "官方來源／研究典藏")} ↗
            </a>
            {dataset.statisticsFile && (
              <a className="text-link" href={dataset.statisticsFile} download>
                {t("Download source statistics", "下載來源統計")} ↗
              </a>
            )}
          </article>
        )}
        {catalogue.data?.resources
          .filter((resource) => resource.section === section)
          .map((resource) => (
            <article className="atlas-resource" key={resource.url}>
              <h3>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  {resource.title[language]} ↗
                </a>
              </h3>
              <p>{resource.description[language]}</p>
            </article>
          ))}
        {section === "culture" && (
          <div className="atlas-resource">
            <h2>{t("Historical study library", "古道歷史研究館")}</h2>
            <p>
              {t(
                "These source studies contain no coordinates. They are information profiles, not invented map routes.",
                "這些來源研究未提供座標，僅建立資料頁，不捏造地圖路線。",
              )}
            </p>
            {studies.map((study) => (
              <Link
                key={study.id}
                href={`/culture/places/${encodeURIComponent(study.id)}`}
              >
                {language === "zh" ? study.titleZh : study.title} ↗
              </Link>
            ))}
          </div>
        )}
        {section === "wildlife" && (
          <div className="atlas-resource">
            <h2>{t("Future observations", "未來觀察資料")}</h2>
            <p>
              {t(
                "This release displays a historical, conservation-screened archive. New community observations can be submitted through the original Taiwan Roadkill Observation Network; EcoAtlas does not pretend to accept or publish submissions without a moderated storage service.",
                "本版呈現經保育篩選的歷史典藏。新的公民觀察可透過原臺灣路死觀察網通報；EcoAtlas 尚未建置審核儲存服務，不會假裝接收或發布投稿。",
              )}
            </p>
            <a
              className="button secondary"
              href="https://roadkill.tw/"
              target="_blank"
              rel="noreferrer"
            >
              {t("Open the observation network", "開啟路死觀察網")} ↗
            </a>
          </div>
        )}
      </div>
      <aside className="atlas-teach" aria-labelledby={`${tabId}-teach`}>
        <h2 id={`${tabId}-teach`}>
          {t("Teach with this subject", "用這個主題教學")}
        </h2>
        <ul>
          {lessonsFor(section).map((lesson) => (
            <li key={lesson.slug}>
              <Link href={`/teach/${lesson.slug}`}>
                {language === "en" ? lesson.title.en : lesson.title.zh}
              </Link>
              <span>
                {language === "en"
                  ? trackLabel[lesson.track].en
                  : trackLabel[lesson.track].zh}{" "}
                · {lesson.minutes} {t("min", "分鐘")}
              </span>
            </li>
          ))}
        </ul>
        <p>
          {filters.county ? (
            <Link href={`/county/${encodeURIComponent(filters.county)}`}>
              {t("Open the profile for", "查看縣市檔案：")}{" "}
              {countyNames[filters.county] || filters.county} →
            </Link>
          ) : (
            <Link href="/county">
              {t("Compare counties side by side", "並排比較各縣市")} →
            </Link>
          )}{" "}
          <Link href="/teach/glossary">{t("Glossary", "名詞解釋")} →</Link>
        </p>
      </aside>
      <Footer />
    </main>
  );
}
