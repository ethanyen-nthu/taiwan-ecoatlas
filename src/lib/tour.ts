/**
 * The figures and map colours behind the "Taiwan in five minutes" page. Every
 * number is worked out here from the same files the rest of the site reads, so
 * the tour cannot say something a page's own chart does not. A county with no
 * value is `null` (drawn hatched); it is never turned into a zero.
 */
import { percentChange } from "@/content/air-history";
import type { AirCountyData } from "@/data/air-county";
import { hazeScale } from "./air-map";
import { buildChoropleth, subjectRamps } from "./choropleth";
import { classOf, type MapScale } from "./county-shapes";
import {
  baselinePeriod,
  countyChanges,
  degrees,
  fullRecordCounties,
  islandSeries,
  periodChange,
  recentPeriod,
  type Period,
  type TempData,
} from "./temperature-history";
import { warmingScales } from "./temperature-map";

export interface L {
  en: string;
  zh: string;
}
export interface CountyRef {
  code: string;
  en: string;
  zh: string;
}
export interface LegendItem {
  color: string;
  label: L;
  /** Draw a round dot instead of a square swatch. */
  dot?: boolean;
}
export interface TourLayer {
  /** A colour for a county with a figure, null for one without, and no entry
   *  for a county the stop does not shade. */
  fills: Record<string, string | null>;
  legend: LegendItem[];
  /** The figure behind each county's colour, null where there is none. */
  values: Record<string, number | null>;
  /** Counties to outline. */
  highlight: string[];
}
export interface Ranked {
  code: string;
  value: number;
}
export interface TourStop<F> {
  layer: TourLayer;
  facts: F;
}

export interface AirFacts {
  firstYear: number;
  firstValue: number;
  lastYear: number;
  lastValue: number;
  dropPct: number;
  mapYear: number;
  highest: Ranked;
  lowest: Ranked;
}
export interface WarmFacts {
  before: number;
  after: number;
  change: number;
  early: Period;
  late: Period;
  /** Counties with a full model record. */
  counted: number;
  /** Counties the model has no values for. */
  missing: string[];
  highest: Ranked;
  lowest: Ranked;
}
export interface ForestFacts {
  year: number;
  highest: Ranked;
  lowest: Ranked;
  unmapped: string[];
}
export interface RoadkillFacts {
  firstYear: number;
  lastYear: number;
  total: number;
  top: Ranked[];
  /** Whole-number share of all reports that the top counties hold. */
  topSharePct: number;
}
export interface PeopleFacts {
  villages: number;
  peoples: number;
  top: Ranked[];
}
export interface TaipeiFacts {
  code: string;
  parks: number;
  trees: number;
  kinds: number;
}

export interface Tour {
  air: TourStop<AirFacts>;
  warm: TourStop<WarmFacts>;
  forest: TourStop<ForestFacts>;
  roadkill: TourStop<RoadkillFacts>;
  people: TourStop<PeopleFacts>;
  taipei: TourStop<TaipeiFacts>;
}

export interface TourInput {
  counties: CountyRef[];
  air: AirCountyData;
  national: { year: number; value: number }[];
  temperature: TempData;
  forests: {
    year: number;
    counties: { code: string; sharePct: number }[];
    unmapped: string[];
  };
  /** Screened wildlife reports per county code, and the years they cover. */
  roadkill: Record<string, number>;
  roadkillYears: { first: number; last: number };
  culture: {
    villages: number;
    peoples: number;
    byCounty: { code: string; count: number }[];
  };
  taipei: { parks: number; trees: number; kinds: number };
}

/** The county the Taipei stop is about. */
export const taipeiCode = "63000";
/** The colour of one village on the peoples stop. */
export const villageColor = "#74311f";
const taipeiColor = subjectRamps.urban[3];

const same = (text: string): L => ({ en: text, zh: text });

/** Every county gets an entry, so one the source leaves out is hatched, not
 *  silently left in the neutral colour. */
function complete(
  counties: CountyRef[],
  values: Record<string, number | null | undefined>,
) {
  return Object.fromEntries(
    counties.map(({ code }) => [code, values[code] ?? null]),
  ) as Record<string, number | null>;
}

/** Highest first; a tie goes to the lower county code so the order is stable. */
export function rank(values: Record<string, number | null>): Ranked[] {
  return Object.entries(values)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([code, value]) => ({ code, value }))
    .sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
}

/** What a class of a scale covers, in words a legend can print. */
export function classLabel(
  scale: MapScale,
  index: number,
  format: (value: number) => string,
): L {
  const { breaks } = scale;
  if (index === 0)
    return {
      en: `below ${format(breaks[0])}`,
      zh: `低於 ${format(breaks[0])}`,
    };
  if (index === breaks.length)
    return {
      en: `${format(breaks[index - 1])} or more`,
      zh: `${format(breaks[index - 1])} 以上`,
    };
  return {
    en: `${format(breaks[index - 1])} to ${format(breaks[index])}`,
    zh: `${format(breaks[index - 1])} 至 ${format(breaks[index])}`,
  };
}

/** Colour counties by a fixed scale and list only the classes that appear. */
export function scaleLayer(
  values: Record<string, number | null>,
  scale: MapScale,
  format: (value: number) => string,
): TourLayer {
  const fills: Record<string, string | null> = {};
  const used = new Set<number>();
  for (const [code, value] of Object.entries(values)) {
    if (value === null) {
      fills[code] = null;
      continue;
    }
    const index = classOf(value, scale);
    used.add(index);
    fills[code] = scale.colors[index];
  }
  return {
    fills,
    values,
    highlight: [],
    legend: [...used]
      .sort((a, b) => a - b)
      .map((index) => ({
        color: scale.colors[index],
        label: classLabel(scale, index, format),
      })),
  };
}

function need<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined)
    throw new Error(`The tour needs ${what}, and the data has none.`);
  return value;
}

function airStop(input: TourInput): TourStop<AirFacts> {
  const { air, national } = input;
  const first = need(national[0], "a national PM2.5 series");
  const last = national[national.length - 1];
  const year = air.lastYear;
  const values = complete(
    input.counties,
    Object.fromEntries(
      air.counties.map((county) => [county.code, county.values[String(year)]]),
    ),
  );
  const ranked = rank(values);
  return {
    layer: scaleLayer(values, hazeScale, (value) => String(value)),
    facts: {
      firstYear: first.year,
      firstValue: first.value,
      lastYear: last.year,
      lastValue: last.value,
      dropPct: percentChange(first.value, last.value),
      mapYear: year,
      highest: need(ranked[0], "a county PM2.5 figure"),
      lowest: ranked[ranked.length - 1],
    },
  };
}

function warmStop(input: TourInput): TourStop<WarmFacts> {
  const data = input.temperature;
  const island = need(
    periodChange(islandSeries(data, "annual")),
    "a full-record island temperature",
  );
  const rows = countyChanges(data);
  const values = complete(
    input.counties,
    Object.fromEntries(
      rows.map((row) => [row.county.code, row.result?.change ?? null]),
    ),
  );
  const ranked = rank(values);
  return {
    layer: scaleLayer(values, warmingScales.annual, (value) =>
      degrees(value, true),
    ),
    facts: {
      before: island.before,
      after: island.after,
      change: island.change,
      early: baselinePeriod,
      late: recentPeriod,
      counted: fullRecordCounties(data).length,
      missing: input.counties
        .filter(({ code }) => values[code] === null)
        .map(({ code }) => code),
      highest: need(ranked[0], "a county temperature change"),
      lowest: ranked[ranked.length - 1],
    },
  };
}

/** Share of mapped land that is forest. Fixed classes, so 40% means the same
 *  thing wherever it appears. */
export const forestScale: MapScale = {
  breaks: [20, 40, 60, 70],
  colors: subjectRamps.forests,
};

function forestStop(input: TourInput): TourStop<ForestFacts> {
  const values = complete(
    input.counties,
    Object.fromEntries(
      input.forests.counties.map((row) => [row.code, row.sharePct]),
    ),
  );
  const ranked = rank(values);
  return {
    layer: scaleLayer(values, forestScale, (value) => `${value}%`),
    facts: {
      year: input.forests.year,
      highest: need(ranked[0], "a county forest share"),
      lowest: ranked[ranked.length - 1],
      unmapped: input.counties
        .filter(({ code }) => values[code] === null)
        .map(({ code }) => code),
    },
  };
}

const grouped = (value: number) => value.toLocaleString("en-US");

function roadkillStop(input: TourInput): TourStop<RoadkillFacts> {
  const counts = Object.fromEntries(
    input.counties
      .filter(({ code }) => (input.roadkill[code] ?? 0) > 0)
      .map(({ code }) => [code, input.roadkill[code]]),
  );
  const values = complete(input.counties, counts);
  const shading = need(
    buildChoropleth(
      Object.entries(counts).map(([code, count]) => ({
        code,
        value: null,
        count,
      })),
      "wildlife",
    ),
    "reports from at least three counties",
  );
  const ranked = rank(values);
  const total = ranked.reduce((sum, row) => sum + row.value, 0);
  const top = ranked.slice(0, 3);
  const fills: Record<string, string | null> = {};
  for (const { code } of input.counties)
    fills[code] = shading.tint[code] ?? null;
  return {
    layer: {
      fills,
      values,
      highlight: [],
      legend: shading.classes.map((item) => ({
        color: item.color,
        label: same(
          item.from === item.to
            ? grouped(item.from)
            : `${grouped(item.from)}–${grouped(item.to)}`,
        ),
      })),
    },
    facts: {
      firstYear: input.roadkillYears.first,
      lastYear: input.roadkillYears.last,
      total,
      top,
      topSharePct: Math.round(
        (100 * top.reduce((sum, row) => sum + row.value, 0)) / total,
      ),
    },
  };
}

function peopleStop(input: TourInput): TourStop<PeopleFacts> {
  const values = Object.fromEntries(
    input.counties.map(({ code }) => [
      code,
      input.culture.byCounty.find((row) => row.code === code)?.count ?? 0,
    ]),
  );
  return {
    layer: {
      fills: {},
      values,
      highlight: [],
      legend: [
        {
          color: villageColor,
          dot: true,
          label: { en: "One village", zh: "一個部落" },
        },
      ],
    },
    facts: {
      villages: input.culture.villages,
      peoples: input.culture.peoples,
      top: rank(values).slice(0, 2),
    },
  };
}

function taipeiStop(input: TourInput): TourStop<TaipeiFacts> {
  const county = input.counties.find(({ code }) => code === taipeiCode);
  return {
    layer: {
      fills: { [taipeiCode]: taipeiColor },
      values: {},
      highlight: [taipeiCode],
      legend: [
        {
          color: taipeiColor,
          label: county ?? { en: "Taipei City", zh: "臺北市" },
        },
      ],
    },
    facts: { code: taipeiCode, ...input.taipei },
  };
}

export function buildTour(input: TourInput): Tour {
  return {
    air: airStop(input),
    warm: warmStop(input),
    forest: forestStop(input),
    roadkill: roadkillStop(input),
    people: peopleStop(input),
    taipei: taipeiStop(input),
  };
}
