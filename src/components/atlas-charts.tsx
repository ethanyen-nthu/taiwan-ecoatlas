"use client";

import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AtlasResult } from "@/lib/atlas-types";
import { useLanguage } from "./providers";
import "./atlas-charts.css";

type TimelineRow = {
  period: string;
  count: number | null;
  value: number | null;
  measured: number;
};

// Empty intervening calendar periods are chart gaps, never synthesized observations.
function withCalendarGaps(rows: AtlasResult["timeline"]): TimelineRow[] {
  const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));
  if (sorted.length < 2) return sorted;
  const first = sorted[0].period;
  const last = sorted.at(-1)!.period;
  const length = first.length;
  if (
    ![4, 7, 10].includes(length) ||
    sorted.some((row) => row.period.length !== length)
  )
    return sorted;
  const valid =
    length === 4
      ? /^\d{4}$/
      : length === 7
        ? /^\d{4}-(0[1-9]|1[0-2])$/
        : /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (sorted.some((row) => !valid.test(row.period))) return sorted;
  const cursor = new Date(
    `${first}${length === 4 ? "-01-01" : length === 7 ? "-01" : ""}T00:00:00Z`,
  );
  const map = new Map(sorted.map((row) => [row.period, row]));
  const result: TimelineRow[] = [];
  const advance = (date: Date) => {
    if (length === 4) date.setUTCFullYear(date.getUTCFullYear() + 1);
    else if (length === 7) date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCDate(date.getUTCDate() + 1);
  };
  for (let i = 0; i < 600; i++) {
    const period = cursor.toISOString().slice(0, length);
    if (period > last) return result;
    result.push(
      map.get(period) || { period, count: null, value: null, measured: 0 },
    );
    advance(cursor);
  }
  // Keep long ranges bounded but still break the line across every missing interval.
  return sorted.flatMap((row, index) => {
    const next = sorted[index + 1];
    if (!next) return [row];
    const following = new Date(
      `${row.period}${length === 4 ? "-01-01" : length === 7 ? "-01" : ""}T00:00:00Z`,
    );
    advance(following);
    const period = following.toISOString().slice(0, length);
    return period < next.period
      ? [row, { period, count: null, value: null, measured: 0 }]
      : [row];
  });
}

export function AtlasCharts({
  result,
  metric,
  countyNames,
}: {
  result: AtlasResult;
  metric: string;
  countyNames: Record<string, string>;
}) {
  const { t, language } = useLanguage();
  const id = useId();
  const [excluded, setExcluded] = useState<string[]>([]);
  const field = result.dataset.fields.find((item) => item.key === metric);
  const numeric = !!metric && metric !== "count";
  const direction = metric === "windDirection";
  const forest = result.dataset.section === "forests";
  const live = result.dataset.id.startsWith("live-");
  const river = /river/i.test(result.dataset.id);
  const wildlife = result.dataset.section === "wildlife";
  const number = new Intl.NumberFormat(language === "zh" ? "zh-TW" : "en", {
    maximumFractionDigits: numeric ? 2 : 0,
  });
  const format = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value)
      ? number.format(value)
      : t("No comparable value", "無可比較數值");
  const countLabel = wildlife
    ? t("Occurrence records", "出現紀錄數")
    : river
      ? t("Samples", "樣本數")
      : live
        ? t("Station reports", "測站報告數")
        : forest
          ? t("County summaries", "縣市摘要數")
          : t("Inventory records", "清冊紀錄數");
  const metricLabel = numeric
    ? `${field?.label[language] || metric}${field?.unit ? ` (${field.unit})` : ""}`
    : countLabel;
  const countyRows = result.counties
    .map((row) => ({
      ...row,
      name: countyNames[row.code] || row.code,
      plotted: numeric ? row.value : row.count,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const selectedRows = countyRows.filter((row) => !excluded.includes(row.code));
  const timeline = withCalendarGaps(result.timeline).map((row) => ({
    ...row,
    plotted: numeric ? row.value : row.count,
  }));
  const history =
    !forest &&
    timeline.filter(
      (row) => row.plotted !== null && Number.isFinite(row.plotted),
    ).length > 1;
  const species = result.species.length > 0;
  const allFrequencies = species
    ? result.species.map((row) => ({ name: row.name, count: row.count }))
    : result.categories;
  const frequencies = [...allFrequencies]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12);
  const toggle = (code: string) =>
    setExcluded((current) =>
      current.includes(code)
        ? current.filter((value) => value !== code)
        : [...current, code],
    );
  const note = forest
    ? t(
        "County values describe the 2023 research classification. Forest share uses mapped area, including unresolved pixels. Missing offshore coverage is not zero forest. A single classification year cannot establish a historical trend or deforestation.",
        "縣市數值來自 2023 年研究分類。森林比例以已繪製區域為分母，包含未判定像素。離島缺資料不代表森林為零；單一年份不能推論歷史趨勢或森林砍伐。",
      )
    : numeric && live
      ? t(
          "Values are descriptive means of the loaded station reports, not population exposure or county-wide conditions. Different station coverage and observation times limit comparison. Regions are ordered by administrative code, without rankings.",
          "數值為已載入測站報告的描述性平均，並非人口暴露量或全縣狀況。測站涵蓋與觀測時間不同，會限制可比性。縣市按行政代碼排列，不作排名。",
        )
      : numeric && river
        ? t(
            "Values are arithmetic means of samples with a reported measurement in the chosen period. Sampling dates, stations and sample counts must be comparable before drawing conclusions. They are not official county pollution rankings.",
            "數值為所選期間有測量值樣本的算術平均。解讀前應確認採樣日期、測站與樣本數可比；本圖並非官方縣市污染排名。",
          )
        : numeric
          ? t(
              "Values are arithmetic means of matching records with a reported measurement. They describe the loaded inventory and its coverage, not all places or organisms in a region. Regions are ordered by administrative code, without rankings.",
              "數值為符合條件且有測量值紀錄的算術平均，僅描述載入清冊及其涵蓋，並非區域所有地點或生物。縣市按行政代碼排列，不作排名。",
            )
          : t(
              "Counts describe matching source records, not complete inventories, species abundance or monitoring effort. Geographic and temporal coverage varies. Regions are ordered by administrative code, without rankings.",
              "筆數代表符合條件的來源紀錄，不等同完整清冊、物種數量或監測投入。地理與時間涵蓋不同；縣市按行政代碼排列，不作排名。",
            );
  const chartStyle = {
    background: "var(--white)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    color: "var(--ink)",
    fontSize: 12,
  };
  const axes = {
    fontSize: 11,
    tickLine: false,
    axisLine: false,
    stroke: "var(--muted)",
  };

  return (
    <div className="atlas-charts">
      <section className="atlas-chart-panel" aria-labelledby={`${id}-county`}>
        <div className="atlas-chart-heading">
          <div>
            <p className="atlas-chart-eyebrow">
              {t("Regional comparison", "區域比較")}
            </p>
            <h3 id={`${id}-county`}>{metricLabel}</h3>
          </div>
          <span className="atlas-chart-meta">
            {t(
              `${selectedRows.length} regions selected`,
              `已選 ${selectedRows.length} 個縣市`,
            )}
          </span>
        </div>
        {countyRows.length > 0 && (
          <details className="atlas-region-picker">
            <summary>
              {t("Choose regions for this comparison", "選擇此比較的縣市")}
            </summary>
            <fieldset>
              <legend>
                {t(
                  "Only the county chart and its table change. Other charts use the page filters.",
                  "僅變更縣市圖與表格；其他圖表依頁面篩選條件呈現。",
                )}
              </legend>
              <div className="atlas-region-actions">
                <button type="button" onClick={() => setExcluded([])}>
                  {t("Select all", "全選")}
                </button>
                <button
                  type="button"
                  onClick={() => setExcluded(countyRows.map((row) => row.code))}
                >
                  {t("Clear selection", "清除選擇")}
                </button>
              </div>
              <div className="atlas-region-options">
                {countyRows.map((row) => (
                  <label key={row.code}>
                    <input
                      type="checkbox"
                      checked={!excluded.includes(row.code)}
                      onChange={() => toggle(row.code)}
                    />
                    {row.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </details>
        )}
        {direction ? (
          <p className="atlas-chart-empty">
            {t(
              "Wind direction is circular. Arithmetic degree averages would be misleading; inspect individual station reports instead.",
              "風向為環狀數值，角度的算術平均會造成誤導；請查看各測站報告。",
            )}
          </p>
        ) : selectedRows.some((row) => row.plotted !== null) ? (
          <figure
            aria-label={`${t("County comparison", "縣市比較")}: ${metricLabel}`}
          >
            <div
              className="atlas-chart-scroll"
              role="region"
              tabIndex={0}
              aria-label={t("Scrollable county chart", "可捲動縣市圖表")}
            >
              <div
                style={{
                  minWidth: Math.max(440, selectedRows.length * 76),
                  height: 310,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selectedRows}
                    margin={{ top: 14, right: 16, bottom: 52, left: 4 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis
                      {...axes}
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={65}
                    />
                    <YAxis {...axes} allowDecimals={numeric} width={60} />
                    <Tooltip
                      contentStyle={chartStyle}
                      formatter={(value) => format(value)}
                    />
                    <Bar
                      dataKey="plotted"
                      name={metricLabel}
                      fill="var(--green)"
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <figcaption>
              {t(
                "Select regions above. Missing numeric values have no bar; open the table for measurement coverage.",
                "可於上方選擇縣市；缺少數值不繪製長條，請展開表格查看測量涵蓋。",
              )}
            </figcaption>
          </figure>
        ) : (
          <p className="atlas-chart-empty">
            {selectedRows.length
              ? t(
                  "No comparable numeric coverage for this selection. Missing values remain missing.",
                  "此選擇沒有可比較的數值涵蓋；缺失值維持缺失。",
                )
              : t(
                  "Choose at least one region to compare. Records without a county cannot enter this chart.",
                  "請至少選擇一個縣市；未提供縣市的紀錄不納入此圖。",
                )}
          </p>
        )}
        <p className="atlas-chart-note">{note}</p>
        {metric === "rainfall" && (
          <p className="atlas-chart-note">
            {t(
              "Rainfall is the reported daily accumulation at stations. These reports are averaged, never summed across hourly updates or presented as county rainfall totals.",
              "雨量為測站發布的當日累積值。此處僅取報告平均，不加總逐時更新，也不作全縣總雨量。",
            )}
          </p>
        )}
        {selectedRows.length > 0 && (
          <details className="atlas-chart-table">
            <summary>
              {t("Comparison data and coverage", "比較資料與涵蓋數")}
            </summary>
            <div className="atlas-chart-scroll" tabIndex={0}>
              <table>
                <caption>
                  {t(
                    "Selected counties in administrative-code order",
                    "按行政代碼排列的已選縣市",
                  )}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Region", "縣市")}</th>
                    <th scope="col">{metricLabel}</th>
                    <th scope="col">{countLabel}</th>
                    {numeric && (
                      <th scope="col">{t("Measured", "有效測量數")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row) => (
                    <tr key={row.code}>
                      <th scope="row">{row.name}</th>
                      <td>{direction ? "—" : format(row.plotted)}</td>
                      <td>{number.format(row.count)}</td>
                      {numeric && <td>{number.format(row.measured)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      <div className="atlas-chart-secondary">
        <section className="atlas-chart-panel" aria-labelledby={`${id}-time`}>
          <p className="atlas-chart-eyebrow">
            {t("Time coverage", "時間涵蓋")}
          </p>
          <h3 id={`${id}-time`}>
            {forest
              ? t("Classification year", "分類年份")
              : t("Historical pattern", "歷史變化")}
          </h3>
          {history && !direction ? (
            <figure
              aria-label={`${t("Chronological series", "時間序列")}: ${metricLabel}`}
            >
              <ResponsiveContainer width="100%" height={255}>
                <LineChart
                  data={timeline}
                  margin={{ top: 24, right: 20, bottom: 12, left: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis {...axes} dataKey="period" minTickGap={24} />
                  <YAxis {...axes} allowDecimals={numeric} width={56} />
                  <Tooltip
                    contentStyle={chartStyle}
                    formatter={(value) => format(value)}
                  />
                  <Line
                    type="linear"
                    dataKey="plotted"
                    name={metricLabel}
                    stroke="var(--green)"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <figcaption>
                {t(
                  "All records matching the page filters; county checkboxes above do not filter this series. Empty calendar periods remain gaps.",
                  "依頁面篩選條件的全部紀錄；上方縣市勾選不影響此序列。無資料的日曆期間維持空缺。",
                )}
              </figcaption>
            </figure>
          ) : (
            <p className="atlas-chart-empty">
              {forest
                ? t(
                    "Only the verified 2023 classification is available. A 2013 baseline has not been verified, so historical change is not calculated.",
                    "目前僅有已驗證的 2023 年分類。2013 年基準尚未驗證，因此不計算歷史變化。",
                  )
                : direction
                  ? t(
                      "Wind-direction trends require circular statistics; no arithmetic mean is plotted.",
                      "風向趨勢需使用環狀統計，此處不繪製算術平均。",
                    )
                  : t(
                      "At least two periods with reported values are needed for a trend. A latest snapshot is not historical storage.",
                      "趨勢至少需要兩個有數值的期間；最新快照不等同歷史典藏。",
                    )}
            </p>
          )}
          {timeline.length > 0 && (
            <details className="atlas-chart-table">
              <summary>{t("Period data", "各期間資料")}</summary>
              <div
                className="atlas-chart-scroll atlas-period-table"
                tabIndex={0}
              >
                <table>
                  <caption>
                    {t(
                      "Reported periods and missing-period markers",
                      "已有報告期間與缺資料標記",
                    )}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("Period", "期間")}</th>
                      <th scope="col">{metricLabel}</th>
                      <th scope="col">{countLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((row) => (
                      <tr key={row.period}>
                        <th scope="row">{row.period}</th>
                        <td>{direction ? "—" : format(row.plotted)}</td>
                        <td>
                          {row.count === null ? "—" : number.format(row.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>

        <section
          className="atlas-chart-panel"
          aria-labelledby={`${id}-frequency`}
        >
          <p className="atlas-chart-eyebrow">
            {t("Record composition", "紀錄組成")}
          </p>
          <h3 id={`${id}-frequency`}>
            {species
              ? t("Species frequency", "物種出現頻率")
              : t("Category frequency", "類別頻率")}
          </h3>
          {frequencies.length ? (
            <>
              <figure
                aria-label={t(
                  "Frequency of matching source records",
                  "符合條件的來源紀錄頻率",
                )}
              >
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(175, frequencies.length * 37 + 40)}
                >
                  <BarChart
                    data={frequencies}
                    layout="vertical"
                    margin={{ top: 12, right: 20, bottom: 8, left: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid horizontal={false} stroke="var(--line)" />
                    <XAxis {...axes} type="number" allowDecimals={false} />
                    <YAxis
                      {...axes}
                      dataKey="name"
                      type="category"
                      width={126}
                      tickFormatter={(label: string) =>
                        label.length > 19 ? `${label.slice(0, 18)}…` : label
                      }
                    />
                    <Tooltip contentStyle={chartStyle} />
                    <Bar
                      dataKey="count"
                      name={countLabel}
                      fill="var(--green)"
                      radius={[0, 3, 3, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <figcaption>
                  {allFrequencies.length > 12
                    ? t(
                        `Showing the 12 most frequent of ${allFrequencies.length} reported groups. Counts are source records, not ecological abundance.`,
                        `顯示 ${allFrequencies.length} 組中紀錄最多的 12 組。筆數是來源紀錄，並非生態數量。`,
                      )
                    : t(
                        "Frequency of records matching the page filters. This does not measure ecological abundance or inventory completeness.",
                        "符合頁面條件的紀錄頻率，不代表生態數量或清冊完整度。",
                      )}
                </figcaption>
              </figure>
              <details className="atlas-chart-table">
                <summary>
                  {t("Frequency data and full labels", "頻率資料與完整名稱")}
                </summary>
                <div className="atlas-chart-scroll" tabIndex={0}>
                  <table>
                    <caption>
                      {t("Displayed frequencies", "目前顯示的頻率")}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">
                          {species
                            ? t("Species", "物種")
                            : t("Category", "類別")}
                        </th>
                        <th scope="col">{countLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequencies.map((row) => (
                        <tr key={row.name}>
                          <th scope="row">{row.name}</th>
                          <td>{number.format(row.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <p className="atlas-chart-empty">
              {t(
                "This source does not provide species or category labels for the selected records.",
                "此來源未提供所選紀錄的物種或類別標籤。",
              )}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default AtlasCharts;
