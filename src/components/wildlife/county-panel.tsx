"use client";
import Link from "next/link";
import { useRef } from "react";
import { findSpeciesInfo, speciesShortName } from "@/content/species-info";
import type { OutlineFile } from "@/lib/outline-map";
import { wildlifeClasses } from "@/lib/wildlife";
import { useLanguage } from "../providers";
import { PhotoThumb } from "../photo-thumb";
import "./county-panel.css";

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

/** What the county map says in words: the chosen county (or all of Taiwan), how
 *  many records it holds, and the animals reported most there, each with a
 *  photo and a link to its page. It sits under the map, which does the shading
 *  and the numbers; this is only the details. */
export function WildlifeCountyPanel({
  outlines,
  rows,
  selected,
  onSelect,
  animals,
  categories,
  loading,
}: {
  outlines: OutlineFile | undefined;
  rows: CountyRow[];
  selected: string;
  onSelect: (code: string) => void;
  animals: AnimalRow[];
  categories: { name: string; count: number }[];
  loading: boolean;
}) {
  const { language, t } = useLanguage();
  const headRef = useRef<HTMLDivElement>(null);
  const fmt = (value: number) =>
    value.toLocaleString(language === "en" ? "en" : "zh-TW");
  const byCode = new Map(rows.map((row) => [row.code, row]));
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

  return (
    <section
      className="cp"
      aria-label={t("Roadkill records by county", "各縣市路死紀錄")}
    >
      <div className="cp-side" aria-live="polite">
        <div className="cp-head" ref={headRef}>
          <p className="cp-kicker">
            {current
              ? t("Selected county", "已選縣市")
              : t("All counties", "全臺各縣市")}
          </p>
          <h2>{current ? nameOf(current.code) : t("Taiwan", "臺灣")}</h2>
          {current && otherNameOf(current.code) && (
            <p className="cp-other" lang={language === "en" ? "zh-Hant" : "en"}>
              {otherNameOf(current.code)}
            </p>
          )}
          <p className="cp-big">
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
          {current ? (
            <button
              type="button"
              className="cp-clear"
              onClick={() => onSelect("")}
            >
              {t("Show all counties", "顯示全臺")}
            </button>
          ) : (
            <p className="cp-hint">
              {t(
                "Select a county on the map to see its animals.",
                "在地圖上選一個縣市，就能看到那裡的動物。",
              )}
            </p>
          )}
        </div>

        {categories.length > 0 && (
          <ul className="cp-groups" aria-label={t("Animal groups", "動物類群")}>
            {categories.slice(0, 5).map((item) => (
              <li key={item.name}>
                {wildlifeClasses[item.name]?.[language] || item.name}{" "}
                <b>{fmt(item.count)}</b>
              </li>
            ))}
          </ul>
        )}

        <p className="cp-note">
          {t(
            "Counts of screened historical reports, not roadkill risk or animal numbers. Counties differ in size, traffic and how closely roads were checked, so a darker county is not necessarily a more dangerous one.",
            "此為經篩選的歷史通報數量，並非路死風險或動物數量。各縣市面積、車流與道路巡查程度不同，顏色較深不代表較危險。",
          )}
        </p>
      </div>

      <div className="cp-animals">
        <h3>
          {current
            ? t(
                `Animals reported most in ${nameOf(current.code)}`,
                `${nameOf(current.code)}通報最多的動物`,
              )
            : t("Animals reported most", "通報最多的動物")}
        </h3>
        {animals.length === 0 ? (
          <p className="cp-empty">
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
                    <PhotoThumb photoKey={item.name} kind="animal" size={52} />
                    <span className="cp-name">
                      <span>{primary}</span>
                      {second && second !== primary && (
                        <small lang={language === "zh" ? "en" : "zh-Hant"}>
                          {second}
                        </small>
                      )}
                    </span>
                    <span className="cp-count">{fmt(item.count)}</span>
                    <span className="cp-bar" aria-hidden="true">
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
          <p className="cp-more">
            {t(
              `${fmt(animals.length - TOP_ANIMALS)} more kinds are in the table below.`,
              `其餘 ${fmt(animals.length - TOP_ANIMALS)} 種見下方表格。`,
            )}
          </p>
        )}
      </div>
    </section>
  );
}
