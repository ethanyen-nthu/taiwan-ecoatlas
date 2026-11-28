"use client";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { YearValue } from "@/lib/temperature-history";
import { useLanguage } from "../providers";
import "./line-chart.css";

export interface LineSeries {
  key: string;
  label: string;
  points: YearValue[];
  /** accent: the page colour; warm: the second colour; soft: the raw yearly
   *  values drawn faintly behind a smoothed line. */
  tone: "accent" | "warm" | "soft";
  /** A dot on every value. */
  dots?: boolean;
  dashed?: boolean;
  /** Write the last value at the end of the line. The highest line writes it
   *  above its end, the others below, so two numbers never sit on each other. */
  endLabel?: boolean;
}

export interface LineReference {
  value: number;
  label: string;
  /** A shorter label for narrow screens. */
  short?: string;
}

/** Round axis ticks that hold every value. */
export function niceScale(low: number, high: number, wanted = 5) {
  const span = Math.max(high - low, 0.01);
  const rough = span / wanted;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 5, 10]
      .map((factor) => factor * magnitude)
      .find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const lo = Math.floor(low / step) * step;
  const hi = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let tick = lo; tick <= hi + step / 2; tick += step) {
    ticks.push(Math.round(tick * 1e6) / 1e6);
  }
  return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks };
}

/** Lines broken wherever a value is missing, so a gap is drawn as a gap. */
export function runs(points: YearValue[]) {
  const out: { year: number; value: number }[][] = [];
  let current: { year: number; value: number }[] = [];
  for (const point of points) {
    if (point.value === null) {
      if (current.length) out.push(current);
      current = [];
    } else {
      current.push({ year: point.year, value: point.value });
    }
  }
  if (current.length) out.push(current);
  return out;
}

/**
 * A hand-drawn yearly line chart. One slider-style control reads out the
 * years, so the chart works with a finger, a mouse or the arrow keys without
 * a row of tiny targets, and the same numbers sit in a table under it.
 */
export function LineChart({
  summary,
  series,
  firstYear,
  lastYear,
  unit,
  format,
  reference,
  scrubLabel,
}: {
  /** One spoken sentence for the picture. */
  summary: string;
  series: LineSeries[];
  firstYear: number;
  lastYear: number;
  unit: string;
  format: (value: number) => string;
  reference?: LineReference;
  scrubLabel: string;
}) {
  const { t } = useLanguage();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(880);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(280, node.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active === null) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!frame.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  const values = series.flatMap((item) =>
    item.points
      .map((point) => point.value)
      .filter((value): value is number => value !== null),
  );
  if (reference) values.push(reference.value);
  const scale = niceScale(Math.min(...values), Math.max(...values));

  const narrow = width < 560;
  const height = narrow ? 300 : 380;
  const margin = { top: 24, right: narrow ? 46 : 64, bottom: 38, left: 42 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const x = (year: number) =>
    margin.left + ((year - firstYear) / (lastYear - firstYear)) * plotW;
  const y = (value: number) =>
    margin.top + (1 - (value - scale.lo) / (scale.hi - scale.lo)) * plotH;
  const perYear = plotW / (lastYear - firstYear);
  const tickEvery = perYear * 10 < 44 ? 20 : 10;
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => firstYear + index,
  );
  const lastValue = (item: LineSeries) =>
    [...item.points].reverse().find((point) => point.value !== null) ?? null;
  const highestEnd = series
    .filter((item) => item.endLabel && lastValue(item))
    .sort(
      (a, b) =>
        (lastValue(b)?.value as number) - (lastValue(a)?.value as number),
    )[0]?.key;
  const valueAt = (item: LineSeries, year: number) =>
    item.points.find((point) => point.year === year)?.value ?? null;

  const nearest = (clientX: number, left: number) => {
    const at = clientX - left;
    return years.reduce((best, year) =>
      Math.abs(x(year) - at) < Math.abs(x(best) - at) ? year : best,
    );
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && event.buttons !== 1) return;
    setActive(
      nearest(event.clientX, event.currentTarget.getBoundingClientRect().left),
    );
  };
  const press = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = years.indexOf(active ?? firstYear);
    const step: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      PageUp: index + 10,
      PageDown: index - 10,
      Home: 0,
      End: years.length - 1,
    };
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (!(event.key in step)) return;
    event.preventDefault();
    setActive(years[Math.min(Math.max(step[event.key], 0), years.length - 1)]);
  };

  const readout = (year: number) =>
    `${year}: ` +
    series
      .map((item) => {
        const value = valueAt(item, year);
        return `${item.label} ${value === null ? t("no value", "無數值") : `${format(value)} ${unit}`}`;
      })
      .join("; ");

  const activeValues = series
    .map((item) => (active === null ? null : valueAt(item, active)))
    .filter((value): value is number => value !== null);
  const tipLeft =
    active === null ? 0 : Math.min(Math.max(x(active), 96), width - 96);
  const tipTop = activeValues.length ? y(Math.max(...activeValues)) : 0;

  return (
    <div className="lc" ref={frame} data-chart="">
      <ul className="lc-legend" aria-hidden="true" data-chart-legend="">
        {series.map((item) => (
          <li key={item.key}>
            <i
              className="lc-key"
              data-tone={item.tone}
              data-dashed={item.dashed ? "" : undefined}
            />
            {item.label}
          </li>
        ))}
        {reference && (
          <li>
            <i className="lc-key" data-tone="ink" data-dashed="" />
            {reference.label}
          </li>
        )}
      </ul>
      <div className="lc-stage" style={{ height }}>
        <svg
          className="lc-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
        >
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                className={tick === scale.lo ? "lc-axis" : "lc-grid"}
                x1={margin.left}
                x2={width - margin.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text x={margin.left - 8} y={y(tick) + 4} textAnchor="end">
                {format(tick)}
              </text>
            </g>
          ))}
          {years.map((year) =>
            year % tickEvery === 0 ? (
              <text key={year} x={x(year)} y={height - 14} textAnchor="middle">
                {year}
              </text>
            ) : null,
          )}
          {reference && (
            <g>
              <line
                className="lc-reference"
                x1={margin.left}
                x2={width - margin.right}
                y1={y(reference.value)}
                y2={y(reference.value)}
              />
            </g>
          )}
          {active !== null && (
            <line
              className="lc-guide"
              x1={x(active)}
              x2={x(active)}
              y1={margin.top}
              y2={y(scale.lo)}
            />
          )}
          {series.map((item) => (
            <g key={item.key} data-tone={item.tone}>
              {runs(item.points).map((run) => (
                <polyline
                  key={run[0].year}
                  className="lc-line"
                  data-dashed={item.dashed ? "" : undefined}
                  points={run
                    .map((point) => `${x(point.year)},${y(point.value)}`)
                    .join(" ")}
                />
              ))}
              {item.dots &&
                item.points.map((point) =>
                  point.value === null ? null : (
                    <circle
                      key={point.year}
                      className="lc-dot"
                      cx={x(point.year)}
                      cy={y(point.value)}
                      r={active === point.year ? 5 : narrow ? 2 : 2.75}
                    />
                  ),
                )}
              {item.endLabel &&
                (() => {
                  const last = lastValue(item);
                  if (!last || last.value === null) return null;
                  return (
                    <text
                      className="lc-end"
                      x={x(last.year) + 8}
                      y={y(last.value) + (item.key === highestEnd ? -6 : 16)}
                    >
                      {format(last.value)}
                    </text>
                  );
                })()}
            </g>
          ))}
          {active !== null &&
            series.map((item) => {
              const value = valueAt(item, active);
              return value === null ? null : (
                <circle
                  key={item.key}
                  className="lc-pick"
                  data-tone={item.tone}
                  cx={x(active)}
                  cy={y(value)}
                  r={6}
                />
              );
            })}
          {reference && (
            <text
              className="lc-reference-label"
              x={width - margin.right - 4}
              y={y(reference.value) + 17}
              textAnchor="end"
            >
              {narrow && reference.short ? reference.short : reference.label}
            </text>
          )}
        </svg>
        <div
          className="lc-scrub"
          role="slider"
          tabIndex={0}
          aria-label={scrubLabel}
          aria-orientation="horizontal"
          aria-valuemin={firstYear}
          aria-valuemax={lastYear}
          aria-valuenow={active ?? firstYear}
          aria-valuetext={readout(active ?? firstYear)}
          onPointerMove={move}
          onPointerDown={move}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
          onFocus={() => setActive((current) => current ?? firstYear)}
          onBlur={() => setActive(null)}
          onKeyDown={press}
        />
        {active !== null && (
          <div
            className="lc-tip"
            role="status"
            data-below={tipTop < 100 ? "" : undefined}
            style={{ left: tipLeft, top: tipTop }}
          >
            <strong>{active}</strong>
            {series.map((item) => {
              const value = valueAt(item, active);
              return (
                <span key={item.key}>
                  {item.label}{" "}
                  {value === null ? t("no value", "無數值") : format(value)}
                </span>
              );
            })}
            <em>{unit}</em>
          </div>
        )}
      </div>
    </div>
  );
}
