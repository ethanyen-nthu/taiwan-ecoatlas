"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { classOf, type MapScale, type ShapeSet } from "@/lib/county-shapes";
import { usedClassRange } from "@/lib/year-map";
import { useLanguage } from "../providers";
import "./year-map.css";

/** The average of one county over a run of years, for the then-and-now view. */
export interface MapPeriod {
  id: string;
  label: string;
  values: Record<string, number | null>;
}

export interface MapMeasure {
  id: string;
  /** The tab label. */
  label: string;
  years: number[];
  /** County code to one value per year, in the order of `years`. */
  values: Record<string, (number | null)[]>;
  scale: MapScale;
  /** How a value is written, with its unit. */
  format: (value: number) => string;
  /** How a difference between two values is written, with its sign. */
  deltaFormat?: (value: number) => string;
  /** How the numbers under the colour bar are written; defaults to `format`. */
  tickFormat?: (value: number) => string;
  /** What the colours mean, written above the colour bar. */
  legendTitle: string;
  /** One figure per year for the whole country, shown beside the year. */
  summary?: { label: string; values: (number | null)[] };
  /** An extra line in the county readout, such as the actual temperature. */
  detail?: (code: string, yearIndex: number) => string | null;
  /** Draw a line at zero in the small chart (for changes from a baseline). */
  zeroLine?: boolean;
  periods: MapPeriod[];
  defaultFrom: string;
  defaultTo: string;
  /** A sentence under the maps. */
  note?: string;
}

type Names = Record<string, { en: string; zh: string }>;

/** Counties made only of islands off the coast. On the map they are tiny, so
 *  they are named beside their islands. */
const offshore = new Set(["09020", "10016", "09007"]);
const short = (text: string) =>
  text.replace(/ (County|City)$/, "").replace(/[縣市]$/, "");

const colourOf = (value: number | null, scale: MapScale) =>
  value === null ? undefined : scale.colors[classOf(value, scale)];

function MapSvg({
  shapes,
  fillOf,
  active,
  onHover,
  onPick,
  label,
  hatch,
  nameOf,
}: {
  shapes: ShapeSet;
  nameOf: (code: string) => string;
  fillOf: (code: string) => string | undefined;
  active: string;
  onHover: (code: string) => void;
  onPick: (code: string) => void;
  label: string;
  hatch: string;
}) {
  const current = shapes.shapes.find((shape) => shape.code === active);
  return (
    <svg
      className="ym-svg"
      viewBox={`0 0 ${shapes.width} ${shapes.height}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <pattern
          id={hatch}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="9" height="9" fill="#f3efe8" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="9"
            stroke="#a9a398"
            strokeWidth="2.4"
          />
        </pattern>
      </defs>
      {shapes.shapes.map((shape) => {
        const fill = fillOf(shape.code);
        return (
          <path
            key={shape.code}
            className="ym-county"
            data-empty={fill ? undefined : ""}
            d={shape.d}
            fill={fill ?? `url(#${hatch})`}
            fillRule="evenodd"
            onPointerEnter={() => onHover(shape.code)}
            onPointerLeave={() => onHover("")}
            onClick={() => onPick(shape.code)}
          />
        );
      })}
      {shapes.shapes
        .filter((shape) => offshore.has(shape.code))
        .map((shape) => (
          <text
            key={shape.code}
            className="ym-island-name"
            x={(shape.box[0] + shape.box[2]) / 2}
            y={shape.box[3] + 34}
            textAnchor="middle"
          >
            {short(nameOf(shape.code))}
          </text>
        ))}
      {current && (
        <path
          className="ym-active"
          d={current.d}
          fill="none"
          fillRule="evenodd"
        />
      )}
    </svg>
  );
}

function Spark({
  values,
  years,
  index,
  low,
  high,
  zeroLine,
  label,
}: {
  values: (number | null)[];
  years: number[];
  index: number;
  low: number;
  high: number;
  zeroLine: boolean;
  label: string;
}) {
  const width = 240;
  const height = 64;
  const x = (i: number) => (i / Math.max(years.length - 1, 1)) * width;
  const y = (v: number) =>
    height - 4 - ((v - low) / Math.max(high - low, 1e-9)) * (height - 8);
  const runs: string[] = [];
  let run: string[] = [];
  values.forEach((value, i) => {
    if (value === null) {
      if (run.length) runs.push(run.join(" "));
      run = [];
    } else run.push(`${x(i).toFixed(1)},${y(value).toFixed(1)}`);
  });
  if (run.length) runs.push(run.join(" "));
  const here = values[index];
  return (
    <svg
      className="ym-spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      {zeroLine && low < 0 && high > 0 && (
        <line x1="0" x2={width} y1={y(0)} y2={y(0)} className="ym-spark-zero" />
      )}
      {runs.map((points) => (
        <polyline
          key={points.slice(0, 24)}
          points={points}
          className="ym-spark-line"
        />
      ))}
      <line
        x1={x(index)}
        x2={x(index)}
        y1="0"
        y2={height}
        className="ym-spark-now"
      />
      {here !== null && here !== undefined && (
        <circle cx={x(index)} cy={y(here)} r="4" className="ym-spark-dot" />
      )}
    </svg>
  );
}

export function YearMap({
  shapes,
  names,
  measures,
  title,
}: {
  shapes: ShapeSet;
  names: Names;
  measures: MapMeasure[];
  title: string;
}) {
  const { language, t } = useLanguage();
  const uid = useId().replace(/:/g, "");
  const hatch = `${uid}-hatch`;
  const [measureId, setMeasureId] = useState(measures[0].id);
  const measure = measures.find((item) => item.id === measureId) ?? measures[0];
  const [view, setView] = useState<"years" | "compare">("years");
  const [yearIndex, setYearIndex] = useState(measure.years.length - 1);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState("");
  const [pinned, setPinned] = useState("");
  const [from, setFrom] = useState(measure.defaultFrom);
  const [to, setTo] = useState(measure.defaultTo);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const year = measure.years[Math.min(yearIndex, measure.years.length - 1)];
  const active = hover || pinned;
  const name = (code: string) =>
    names[code] ? (language === "en" ? names[code].en : names[code].zh) : code;

  // The legend and the small chart use one scale for the whole record, so
  // dragging the slider never changes what a colour means.
  const range = useMemo(
    () => usedClassRange(Object.values(measure.values), measure.scale),
    [measure],
  );
  const extent = useMemo(() => {
    let low = Infinity;
    let high = -Infinity;
    for (const row of Object.values(measure.values))
      for (const value of row)
        if (value !== null) {
          low = Math.min(low, value);
          high = Math.max(high, value);
        }
    return [low, high] as const;
  }, [measure]);
  const [firstClass, lastClass] = range ?? [0, measure.scale.colors.length - 1];
  const legendColors = measure.scale.colors.slice(firstClass, lastClass + 1);
  const legendBreaks = measure.scale.breaks.slice(firstClass, lastClass);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setYearIndex((index) => {
        if (index + 1 >= measure.years.length) {
          setPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, 380);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, measure]);

  const chooseMeasure = (id: string) => {
    const next = measures.find((item) => item.id === id);
    if (!next || next.id === measure.id) return;
    const sameYear = next.years.indexOf(year);
    setMeasureId(id);
    if (sameYear !== -1) setYearIndex(sameYear);
    else setYearIndex(year < next.years[0] ? 0 : next.years.length - 1);
    setFrom(next.defaultFrom);
    setTo(next.defaultTo);
    setPlaying(false);
  };

  const rowAt = (code: string) => measure.values[code]?.[yearIndex] ?? null;
  const periodOf = (id: string) =>
    measure.periods.find((period) => period.id === id) ?? measure.periods[0];
  const earlier = periodOf(from);
  const later = periodOf(to);

  const sorted = Object.keys(names).sort((a, b) =>
    name(a).localeCompare(name(b), language === "en" ? "en" : "zh-Hant"),
  );
  const withValues = Object.keys(measure.values);

  const readoutValue = active && view === "years" ? rowAt(active) : null;
  const detail =
    active && view === "years" && readoutValue !== null
      ? measure.detail?.(active, yearIndex)
      : null;

  const valueText = (value: number | null) =>
    value === null ? t("No value", "無數值") : measure.format(value);

  const summaryValue = measure.summary?.values[yearIndex] ?? null;
  const yearText = String(year);
  const sliderText = `${yearText}${
    summaryValue !== null && measure.summary
      ? `, ${measure.summary.label} ${measure.format(summaryValue)}`
      : ""
  }`;

  const mapLabel = (what: string) =>
    t(
      `Map of Taiwan’s counties shaded by ${what}. Counties with no value are hatched.`,
      `臺灣各縣市地圖，依「${what}」著色；沒有數值的縣市以斜線標示。`,
    );

  return (
    <div className="ym" data-view={view}>
      <div className="ym-top">
        {measures.length > 1 && (
          <div
            className="ym-seg"
            role="group"
            aria-label={t("What to show", "顯示內容")}
          >
            {measures.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === measure.id}
                onClick={() => chooseMeasure(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <div
          className="ym-seg"
          role="group"
          aria-label={t("How to look", "觀看方式")}
        >
          <button
            type="button"
            aria-pressed={view === "years"}
            onClick={() => setView("years")}
          >
            {t("Year by year", "逐年")}
          </button>
          <button
            type="button"
            aria-pressed={view === "compare"}
            onClick={() => {
              setView("compare");
              setPlaying(false);
            }}
          >
            {t("Then and now", "今昔對照")}
          </button>
        </div>
      </div>

      {view === "years" ? (
        <div className="ym-stage">
          <figure className="ym-map">
            <MapSvg
              shapes={shapes}
              nameOf={name}
              hatch={hatch}
              active={active}
              onHover={setHover}
              onPick={(code) => setPinned((now) => (now === code ? "" : code))}
              fillOf={(code) => colourOf(rowAt(code), measure.scale)}
              label={mapLabel(`${title}, ${yearText}`)}
            />
          </figure>
          <div className="ym-control">
            <p className="ym-year" aria-hidden="true">
              {yearText}
            </p>
            {measure.summary && (
              <p className="ym-summary">
                {measure.summary.label}:{" "}
                <strong>
                  {summaryValue === null ? "—" : measure.format(summaryValue)}
                </strong>
              </p>
            )}
            <div className="ym-slider">
              <label htmlFor={`${uid}-year`}>{t("Year", "年份")}</label>
              <div className="ym-slider-row">
                <button
                  type="button"
                  className="ym-play"
                  onClick={() => {
                    if (!playing && yearIndex >= measure.years.length - 1)
                      setYearIndex(0);
                    setPlaying((now) => !now);
                  }}
                  aria-label={
                    playing
                      ? t("Pause", "暫停")
                      : t("Play through the years", "依年份播放")
                  }
                >
                  {playing ? (
                    <Pause size={18} aria-hidden="true" />
                  ) : (
                    <Play size={18} aria-hidden="true" />
                  )}
                </button>
                <input
                  id={`${uid}-year`}
                  type="range"
                  min={0}
                  max={measure.years.length - 1}
                  step={1}
                  value={yearIndex}
                  aria-valuetext={sliderText}
                  onChange={(event) => {
                    setPlaying(false);
                    setYearIndex(Number(event.target.value));
                  }}
                />
              </div>
              <div className="ym-slider-ends" aria-hidden="true">
                <span>{measure.years[0]}</span>
                <span>{measure.years[measure.years.length - 1]}</span>
              </div>
            </div>
          </div>
          <div className="ym-detail">
            <div className="ym-pick">
              <label htmlFor={`${uid}-county`}>
                {t("Look at one county", "查看一個縣市")}
              </label>
              <select
                id={`${uid}-county`}
                value={pinned}
                onChange={(event) => setPinned(event.target.value)}
              >
                <option value="">{t("None chosen", "未選擇")}</option>
                {sorted.map((code) => (
                  <option key={code} value={code}>
                    {name(code)}
                  </option>
                ))}
              </select>
            </div>

            <div className="ym-readout" aria-live={playing ? "off" : "polite"}>
              {active ? (
                <>
                  <p className="ym-readout-name">{name(active)}</p>
                  <p className="ym-readout-value">
                    {readoutValue === null ? (
                      <span className="ym-none">
                        {t("No value for this year", "這一年沒有數值")}
                      </span>
                    ) : (
                      measure.format(readoutValue)
                    )}
                  </p>
                  {detail && <p className="ym-readout-detail">{detail}</p>}
                  {withValues.includes(active) &&
                    measure.values[active].some((value) => value !== null) && (
                      <Spark
                        values={measure.values[active]}
                        years={measure.years}
                        index={yearIndex}
                        low={extent[0]}
                        high={extent[1]}
                        zeroLine={measure.zeroLine ?? false}
                        label={t(
                          `${name(active)} across all years; the marker is ${yearText}.`,
                          `${name(active)} 歷年變化；標記為 ${yearText} 年。`,
                        )}
                      />
                    )}
                  {withValues.includes(active) &&
                    measure.values[active].some((value) => value !== null) && (
                      <p className="ym-spark-ends" aria-hidden="true">
                        <span>{measure.years[0]}</span>
                        <span>{measure.years[measure.years.length - 1]}</span>
                      </p>
                    )}
                </>
              ) : (
                <p className="ym-hint">
                  {t(
                    "Point at a county, tap one, or choose one from the list.",
                    "將游標移到縣市上、點選，或從清單挑選。",
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="ym-compare">
          <div className="ym-pair">
            {[
              {
                key: "from",
                period: earlier,
                set: setFrom,
                text: t("Earlier", "較早"),
              },
              {
                key: "to",
                period: later,
                set: setTo,
                text: t("Later", "較晚"),
              },
            ].map(({ key, period, set, text }) => (
              <figure key={key} className="ym-map">
                <div className="ym-pick">
                  <label htmlFor={`${uid}-${key}`}>{text}</label>
                  <select
                    id={`${uid}-${key}`}
                    value={period.id}
                    onChange={(event) => set(event.target.value)}
                  >
                    {measure.periods.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <MapSvg
                  shapes={shapes}
                  nameOf={name}
                  hatch={hatch}
                  active={active}
                  onHover={setHover}
                  onPick={(code) =>
                    setPinned((now) => (now === code ? "" : code))
                  }
                  fillOf={(code) =>
                    colourOf(period.values[code] ?? null, measure.scale)
                  }
                  label={mapLabel(`${title}, ${period.label}`)}
                />
                <figcaption>{period.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="ym-readout" aria-live="polite">
            {active ? (
              <>
                <p className="ym-readout-name">{name(active)}</p>
                <p className="ym-readout-value">
                  {earlier.label}: {valueText(earlier.values[active] ?? null)}
                  <span className="ym-arrow" aria-hidden="true">
                    {" "}
                    →{" "}
                  </span>
                  <span className="ym-sr"> {t("then", "接著")} </span>
                  {later.label}: {valueText(later.values[active] ?? null)}
                </p>
                {earlier.values[active] != null &&
                  later.values[active] != null && (
                    <p className="ym-readout-detail">
                      {t("Difference", "差異")}:{" "}
                      {(measure.deltaFormat ?? measure.format)(
                        (later.values[active] as number) -
                          (earlier.values[active] as number),
                      )}
                    </p>
                  )}
              </>
            ) : (
              <p className="ym-hint">
                {t(
                  "Point at a county or tap one to read its two values.",
                  "將游標移到縣市上或點選，即可讀出兩個數值。",
                )}
              </p>
            )}
          </div>
          <div className="ym-pick">
            <label htmlFor={`${uid}-county2`}>
              {t("Look at one county", "查看一個縣市")}
            </label>
            <select
              id={`${uid}-county2`}
              value={pinned}
              onChange={(event) => setPinned(event.target.value)}
            >
              <option value="">{t("None chosen", "未選擇")}</option>
              {sorted.map((code) => (
                <option key={code} value={code}>
                  {name(code)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="ym-legend" role="group" aria-label={measure.legendTitle}>
        <p className="ym-legend-title">{measure.legendTitle}</p>
        <div className="ym-legend-row">
          <div className="ym-legend-scale">
            <div className="ym-legend-bar" aria-hidden="true">
              {legendColors.map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </div>
            <ul className="ym-legend-ticks">
              {legendBreaks.map((edge, index) => (
                <li
                  key={edge}
                  style={{
                    left: `${((index + 1) / legendColors.length) * 100}%`,
                  }}
                >
                  {(measure.tickFormat ?? measure.format)(edge)}
                </li>
              ))}
            </ul>
          </div>
          <p className="ym-legend-none">
            <span className="ym-legend-swatch" aria-hidden="true" />
            {t("No data", "無資料")}
          </p>
        </div>
      </div>
      {measure.note && <p className="ym-note">{measure.note}</p>}
    </div>
  );
}
