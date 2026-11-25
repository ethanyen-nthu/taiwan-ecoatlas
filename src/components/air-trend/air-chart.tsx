"use client";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  centralSouthPm25,
  nationalPm25,
  yardsticks,
  yearSpan,
} from "@/content/air-history";
import { useLanguage } from "../providers";

const yMax = 26;
const ticks = [0, 5, 10, 15, 20, 25];
const years = Array.from(
  { length: yearSpan.last - yearSpan.first + 1 },
  (_, index) => yearSpan.first + index,
);
const plotted = nationalPm25.map((point) => point.year);
const one = (value: number) => value.toFixed(1);

/** A hand-drawn line chart: two series, three yardsticks and an honest gap.
 *  One slider-style control reads out the years, so the chart works with a
 *  finger, a mouse or the arrow keys without a row of tiny targets. */
export function AirChart() {
  const { language, t } = useLanguage();
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

  const narrow = width < 560;
  const height = narrow ? 300 : 380;
  const margin = { top: 28, right: narrow ? 18 : 30, bottom: 38, left: 38 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const x = (year: number) =>
    margin.left +
    ((year - yearSpan.first) / (yearSpan.last - yearSpan.first)) * plotW;
  const y = (value: number) => margin.top + (1 - value / yMax) * plotH;
  const labelEvery = plotW / years.length < 38 ? 2 : 1;

  const segment = (from: number, to: number) =>
    nationalPm25
      .filter((point) => point.year >= from && point.year <= to)
      .map((point) => `${x(point.year)},${y(point.value)}`)
      .join(" ");
  const early = nationalPm25.filter((point) => point.year <= 2019);
  const late = nationalPm25.filter((point) => point.year >= 2022);
  const bridge = [early[early.length - 1], late[0]];

  const activeNational = nationalPm25.find((point) => point.year === active);
  const activeRegional = centralSouthPm25.find(
    (point) => point.year === active,
  );
  const tipValues = [activeNational?.value, activeRegional?.value].filter(
    (value): value is number => value !== undefined,
  );
  const tipLeft =
    active === null ? 0 : Math.min(Math.max(x(active), 84), width - 84);
  const tipTop = tipValues.length ? y(Math.max(...tipValues)) : 0;

  const nearest = (clientX: number, left: number) => {
    const at = clientX - left;
    return plotted.reduce((best, year) =>
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
    const index = plotted.indexOf(active ?? plotted[0]);
    const step: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: plotted.length - 1,
    };
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (!(event.key in step)) return;
    event.preventDefault();
    setActive(
      plotted[Math.min(Math.max(step[event.key], 0), plotted.length - 1)],
    );
  };

  const readout = (year: number) => {
    const national = nationalPm25.find((point) => point.year === year);
    const regional = centralSouthPm25.find((point) => point.year === year);
    return (
      t(
        `${year}: national average ${national ? one(national.value) : ""} micrograms per cubic metre`,
        `${year} 年：全國平均 ${national ? one(national.value) : ""} 微克／立方公尺`,
      ) +
      (regional
        ? t(
            `; central and southern Taiwan ${one(regional.value)}`,
            `；中南部 ${one(regional.value)}`,
          )
        : "")
    );
  };

  const summary = t(
    `Line chart of Taiwan's annual average PM2.5 from ${nationalPm25[0].value} micrograms per cubic metre in ${yearSpan.first} to ${nationalPm25[nationalPm25.length - 1].value} in ${yearSpan.last}. 2020 and 2021 are not plotted.`,
    `臺灣 PM2.5 年平均濃度折線圖，自 ${yearSpan.first} 年的 ${nationalPm25[0].value} 微克／立方公尺，降到 ${yearSpan.last} 年的 ${nationalPm25[nationalPm25.length - 1].value}。2020 與 2021 年未繪出。`,
  );
  const gapMiddle = (x(2019) + x(2022)) / 2;
  const lastNational = nationalPm25[nationalPm25.length - 1];

  return (
    <div className="air-chart" ref={frame}>
      <ul className="air-legend" aria-hidden="true">
        <li>
          <i className="air-key air-key-national" />
          {t("National average", "全國平均")}
        </li>
        <li>
          <i className="air-key air-key-region" />
          {t(
            "Central and southern Taiwan (selected years)",
            "中南部地區（部分年份）",
          )}
        </li>
      </ul>
      <div className="air-stage" style={{ height }}>
        <svg
          className="air-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className={tick === 0 ? "air-axis" : "air-grid"}
                x1={margin.left}
                x2={width - margin.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text x={margin.left - 8} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {years.map((year, index) =>
            index % labelEvery === 0 ? (
              <text key={year} x={x(year)} y={height - 14} textAnchor="middle">
                {year}
              </text>
            ) : null,
          )}
          <rect
            className="air-gap"
            x={x(2019) + 10}
            y={margin.top}
            width={x(2022) - x(2019) - 20}
            height={plotH}
            rx="6"
          />
          <text
            className="air-gap-label"
            x={gapMiddle}
            y={y(0) - 26}
            textAnchor="middle"
          >
            <tspan x={gapMiddle}>2020–21</tspan>
            <tspan x={gapMiddle} dy="14">
              {t("not plotted", "未繪出")}
            </tspan>
          </text>
          {yardsticks.map((line) => (
            <g key={line.id}>
              <line
                className="air-yardstick"
                strokeDasharray={line.dashed ? "2 5" : "6 4"}
                x1={margin.left}
                x2={width - margin.right}
                y1={y(line.value)}
                y2={y(line.value)}
              />
              <text
                className="air-yardstick-label"
                x={margin.left + 8}
                y={y(line.value) - 6}
              >
                {narrow ? line.short[language] : line.label[language]}
              </text>
            </g>
          ))}
          <polyline
            className="air-bridge"
            points={bridge
              .map((point) => `${x(point.year)},${y(point.value)}`)
              .join(" ")}
          />
          <polyline
            className="air-line"
            pathLength={1}
            points={segment(yearSpan.first, 2019)}
          />
          <polyline
            className="air-line air-line-late"
            pathLength={1}
            points={segment(2022, yearSpan.last)}
          />
          <polyline
            className="air-region-line"
            points={centralSouthPm25
              .map((point) => `${x(point.year)},${y(point.value)}`)
              .join(" ")}
          />
          {active !== null && (
            <line
              className="air-guide"
              x1={x(active)}
              x2={x(active)}
              y1={margin.top}
              y2={y(0)}
            />
          )}
          {centralSouthPm25.map((point) => (
            <circle
              key={`r${point.year}`}
              className="air-dot air-dot-region"
              cx={x(point.year)}
              cy={y(point.value)}
              r={active === point.year ? 7 : 5}
            />
          ))}
          {nationalPm25.map((point) => (
            <circle
              key={`n${point.year}`}
              className="air-dot air-dot-national"
              cx={x(point.year)}
              cy={y(point.value)}
              r={active === point.year ? 7 : 5}
            />
          ))}
          <text className="air-end" x={x(yearSpan.first) + 4} y={y(24.0) - 12}>
            {one(nationalPm25[0].value)}
          </text>
          <text
            className="air-end"
            x={x(yearSpan.last)}
            y={y(lastNational.value) + 24}
            textAnchor="end"
          >
            {one(lastNational.value)}
          </text>
          <text
            className="air-end air-end-region"
            x={x(yearSpan.last)}
            y={y(14.8) - 12}
            textAnchor="end"
          >
            {one(14.8)}
          </text>
        </svg>
        <div
          className="air-scrub"
          role="slider"
          tabIndex={0}
          aria-label={t(
            "Read the chart year by year. Use the left and right arrow keys.",
            "逐年讀取圖表。請使用左右方向鍵。",
          )}
          aria-orientation="horizontal"
          aria-valuemin={yearSpan.first}
          aria-valuemax={yearSpan.last}
          aria-valuenow={active ?? plotted[0]}
          aria-valuetext={readout(active ?? plotted[0])}
          onPointerMove={move}
          onPointerDown={move}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
          onFocus={() => setActive((current) => current ?? plotted[0])}
          onBlur={() => setActive(null)}
          onKeyDown={press}
        />
        {active !== null && (
          <div
            className="air-tip"
            role="status"
            data-below={tipTop < 100 ? "" : undefined}
            style={{ left: tipLeft, top: tipTop }}
          >
            <strong>{active}</strong>
            {activeNational && (
              <span>
                {t("National", "全國")} {one(activeNational.value)}
              </span>
            )}
            {activeRegional && (
              <span>
                {t("Central and south", "中南部")} {one(activeRegional.value)}
              </span>
            )}
            <em>µg/m³</em>
          </div>
        )}
      </div>
    </div>
  );
}
