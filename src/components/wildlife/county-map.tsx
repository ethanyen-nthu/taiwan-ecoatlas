"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { findSpeciesInfo, speciesShortName } from "@/content/species-info";
import type { Choropleth } from "@/lib/choropleth";
import type { OutlineFile } from "@/lib/outline-map";
import { wildlifeClasses } from "@/lib/wildlife";
import {
  buildIslandMap,
  countyFills,
  labelFits,
  offshoreCounties,
} from "@/lib/wildlife-map";
import { useLanguage } from "../providers";
import "./county-map.css";

export interface CountyRow {
  code: string;
  name: string;
  count: number;
}
export interface AnimalRow {
  id: string;
  /** Scientific name; the common names are looked up from it. */
  name: string;
  count: number;
}

const TOP_ANIMALS = 8;

/** The roadkill records as one calm picture: Taiwan drawn flat, every county
 *  shaded by how many records it holds, the number printed inside, and beside
 *  it the animals reported most there. Nothing here is a place where something
 *  happened; it is a count per county, so the picture says only that. */
export function WildlifeCountyMap({
  outlines,
  rows,
  selected,
  onSelect,
  choropleth,
  animals,
  categories,
  loading,
}: {
  outlines: OutlineFile | undefined;
  rows: CountyRow[];
  selected: string;
  onSelect: (code: string) => void;
  choropleth: Choropleth | null;
  animals: AnimalRow[];
  categories: { name: string; count: number }[];
  loading: boolean;
}) {
  const { language, t } = useLanguage();
  const [hover, setHover] = useState("");
  const headRef = useRef<HTMLDivElement>(null);
  const fmt = (value: number) =>
    value.toLocaleString(language === "en" ? "en" : "zh-TW");
  const island = useMemo(
    () => (outlines ? buildIslandMap(outlines, 320, 580) : null),
    [outlines],
  );
  const fills = useMemo(
    () => countyFills(rows, choropleth),
    [rows, choropleth],
  );
  const byCode = useMemo(
    () => new Map(rows.map((row) => [row.code, row])),
    [rows],
  );
  const nameOf = (code: string) =>
    byCode.get(code)?.name ||
    (outlines?.[code]
      ? language === "en"
        ? outlines[code].en
        : outlines[code].name
      : code);
  const otherNameOf = (code: string) =>
    outlines?.[code]
      ? language === "en"
        ? outlines[code].name
        : outlines[code].en
      : "";
  const rowsTotal = rows.reduce((sum, row) => sum + row.count, 0);
  const current = selected ? byCode.get(selected) : undefined;
  const shown = current ? current.count : rowsTotal;
  const topCount = Math.max(1, ...animals.map((item) => item.count));
  const drawn = island
    ? [
        ...island.shapes.filter((shape) => shape.code !== selected),
        ...island.shapes.filter((shape) => shape.code === selected),
      ]
    : [];
  const noneCount = island
    ? island.shapes.filter((shape) => !fills[shape.code]).length
    : 0;
  const pick = (code: string) => {
    onSelect(code === selected ? "" : code);
    // On a phone the details sit below the map; bring them into view.
    if (code !== selected && window.matchMedia("(max-width: 760px)").matches)
      window.requestAnimationFrame(() =>
        headRef.current?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        }),
      );
  };
  const tipShape = island?.shapes.find((shape) => shape.code === hover);

  return (
    <section
      className="wm"
      aria-label={t("Roadkill records by county", "各縣市路死紀錄")}
    >
      <div className="wm-map">
        {island ? (
          <svg
            viewBox={`0 0 ${island.width} ${island.height}`}
            data-picked={
              island.shapes.some((shape) => shape.code === selected)
                ? ""
                : undefined
            }
            role="group"
            aria-label={t(
              "Map of Taiwan shaded by the number of included records in each county. Select a county for details.",
              "依各縣市收錄紀錄數著色的臺灣地圖。選取縣市可看詳情。",
            )}
          >
            {drawn.map((shape) => {
              const fill = fills[shape.code];
              const count = byCode.get(shape.code)?.count ?? 0;
              const name = nameOf(shape.code);
              return (
                <path
                  key={shape.code}
                  d={shape.d}
                  fill={fill?.fill}
                  className={`wm-county${fill ? "" : " is-empty"}${
                    shape.code === selected ? " is-selected" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={shape.code === selected}
                  aria-label={
                    count > 0
                      ? t(
                          `${name}: ${fmt(count)} records`,
                          `${name}：${fmt(count)} 筆紀錄`,
                        )
                      : t(`${name}: no records`, `${name}：無紀錄`)
                  }
                  onClick={() => pick(shape.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      pick(shape.code);
                    }
                  }}
                  onMouseEnter={() => setHover(shape.code)}
                  onMouseLeave={() => setHover("")}
                  onFocus={() => setHover(shape.code)}
                  onBlur={() => setHover("")}
                />
              );
            })}
            {island.shapes.map((shape) => {
              const fill = fills[shape.code];
              const count = byCode.get(shape.code)?.count ?? 0;
              if (!shape.anchor || !fill) return null;
              const text = fmt(count);
              if (!labelFits(text, shape.anchor.r)) return null;
              return (
                <text
                  key={shape.code}
                  x={shape.anchor.x}
                  y={shape.anchor.y}
                  className={`wm-num wm-num-${fill.ink}`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {text}
                </text>
              );
            })}
            {tipShape?.anchor && (
              <text
                className="wm-tip"
                x={Math.min(Math.max(tipShape.anchor.x, 70), island.width - 70)}
                y={Math.max(tipShape.anchor.y - 16, 14)}
                textAnchor="middle"
                aria-hidden="true"
              >
                {nameOf(hover)} · {fmt(byCode.get(hover)?.count ?? 0)}
              </text>
            )}
          </svg>
        ) : (
          <p className="wm-loading">{t("Drawing the map…", "正在繪製地圖…")}</p>
        )}
        <div
          className="wm-legend"
          role="group"
          aria-label={t("County shading key", "縣市著色圖例")}
        >
          <strong>
            {t("Included records per county", "各縣市收錄紀錄數")}
          </strong>
          <ol>
            {choropleth ? (
              choropleth.classes.map((item) => (
                <li key={item.color}>
                  <i style={{ background: item.color }} />
                  {item.from === item.to
                    ? fmt(item.from)
                    : `${fmt(item.from)}–${fmt(item.to)}`}
                </li>
              ))
            ) : (
              <li>
                <i style={{ background: Object.values(fills)[0]?.fill }} />
                {t("Has records", "有紀錄")}
              </li>
            )}
            {noneCount > 0 && (
              <li>
                <i className="wm-none" />
                {t("None", "無")}
              </li>
            )}
          </ol>
        </div>
        <div className="wm-offshore">
          <span>{t("Offshore islands", "離島")}</span>
          {offshoreCounties.map((code) => {
            const count = byCode.get(code)?.count ?? 0;
            return (
              <button
                type="button"
                key={code}
                className="wm-chip"
                aria-pressed={selected === code}
                disabled={count === 0}
                onClick={() => pick(code)}
              >
                <i
                  className={fills[code] ? undefined : "wm-none"}
                  style={fills[code] ? { background: fills[code].fill } : {}}
                />
                {nameOf(code)} <b>{fmt(count)}</b>
              </button>
            );
          })}
        </div>
      </div>

      <div className="wm-side" aria-live="polite">
        <div className="wm-head" ref={headRef}>
          <p className="wm-kicker">
            {current
              ? t("Selected county", "已選縣市")
              : t("All counties", "全臺各縣市")}
          </p>
          <h2>{current ? nameOf(current.code) : t("Taiwan", "臺灣")}</h2>
          {current && otherNameOf(current.code) && (
            <p className="wm-other" lang={language === "en" ? "zh-Hant" : "en"}>
              {otherNameOf(current.code)}
            </p>
          )}
          <p className="wm-big">
            <strong>{loading ? "—" : fmt(shown)}</strong>{" "}
            <span>
              {t("records included", "筆收錄紀錄")}
              {current && rowsTotal > 0
                ? t(
                    ` · ${Math.round((current.count / rowsTotal) * 100)}% of ${fmt(rowsTotal)}`,
                    `・佔全部 ${fmt(rowsTotal)} 筆的 ${Math.round((current.count / rowsTotal) * 100)}%`,
                  )
                : ""}
            </span>
          </p>
          {current && (
            <button
              type="button"
              className="wm-clear"
              onClick={() => onSelect("")}
            >
              {t("Show all counties", "顯示全臺")}
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <ul className="wm-groups" aria-label={t("Animal groups", "動物類群")}>
            {categories.slice(0, 5).map((item) => (
              <li key={item.name}>
                {wildlifeClasses[item.name]?.[language] || item.name}{" "}
                <b>{fmt(item.count)}</b>
              </li>
            ))}
          </ul>
        )}

        <div className="wm-animals">
          <h3>
            {current
              ? t(
                  `Animals reported most in ${nameOf(current.code)}`,
                  `${nameOf(current.code)}通報最多的動物`,
                )
              : t("Animals reported most", "通報最多的動物")}
          </h3>
          {animals.length === 0 ? (
            <p className="wm-empty">
              {loading
                ? t("Loading…", "載入中…")
                : t(
                    "No animals match these filters.",
                    "沒有符合篩選條件的動物。",
                  )}
            </p>
          ) : (
            <ol>
              {animals.slice(0, TOP_ANIMALS).map((item) => {
                const info = findSpeciesInfo(item.name);
                const primary = speciesShortName(item.name, language);
                const second = language === "zh" ? info?.en : info?.zh;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/wildlife/species/${encodeURIComponent(item.id)}`}
                    >
                      <span className="wm-name">
                        <span>{primary}</span>
                        {second && second !== primary && (
                          <small lang={language === "zh" ? "en" : "zh-Hant"}>
                            {second}
                          </small>
                        )}
                      </span>
                      <span className="wm-count">{fmt(item.count)}</span>
                      <span className="wm-bar" aria-hidden="true">
                        <i
                          style={{
                            width: `${Math.max(3, (item.count / topCount) * 100)}%`,
                          }}
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          {animals.length > TOP_ANIMALS && (
            <p className="wm-more">
              {t(
                `${fmt(animals.length - TOP_ANIMALS)} more kinds are in the table below.`,
                `其餘 ${fmt(animals.length - TOP_ANIMALS)} 種見下方表格。`,
              )}
            </p>
          )}
        </div>

        <p className="wm-note">
          {t(
            "Counts of screened historical reports, not roadkill risk or animal numbers. Counties differ in size, traffic and how closely roads were checked, so a darker county is not necessarily a more dangerous one.",
            "此為經篩選的歷史通報數量，並非路死風險或動物數量。各縣市面積、車流與道路巡查程度不同，顏色較深不代表較危險。",
          )}
        </p>
      </div>
    </section>
  );
}
