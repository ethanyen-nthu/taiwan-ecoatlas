"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  airSources,
  centralSouthPm25,
  gapYears,
  nationalPm25,
  percentChange,
  redAlerts,
  yearSpan,
} from "@/content/air-history";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import { AirChart } from "./air-chart";
import "../teach/teach.css";
import "./air-trend.css";

const one = (value: number) => value.toFixed(1);

export function AirTrend() {
  const { language, t } = useLanguage();
  const first = nationalPm25[0];
  const last = nationalPm25[nationalPm25.length - 1];
  const drop = percentChange(first.value, last.value);
  const southFirst = centralSouthPm25[1];
  const southLast = centralSouthPm25[2];
  const southDrop = percentChange(southFirst.value, southLast.value);
  const minus = (value: number) => `−${Math.abs(value)}%`;

  const notes: { title: string; body: string }[] = [
    {
      title: t("Measured the ministry's way", "依環境部的方法測量"),
      body: t(
        "The ministry's national figure averages 24-hour filter samples from 31 stations, and it is the method used to judge whether Taiwan meets its standard. Other sources average raw instrument readings, sometimes with low-cost sensors. For 2025 the ministry reports 12.8 and IQAir reports 13.3. The ministry says sensor readings are easily affected by conditions and equipment, so they can differ from standardised monitoring. Same country, same year, two numbers: check the method before comparing.",
        "環境部的全國數字，是 31 個測站 24 小時濾紙採樣的平均，也是判斷臺灣是否達到標準的依據。其他來源多以儀器即時讀數平均，有時納入低成本感測器。2025 年環境部公布 12.8，IQAir 公布 13.3。環境部表示，感測器數據易受環境條件與設備品質影響，與標準化監測會有落差。同一年、同一個國家出現兩個數字：比較之前先看方法。",
      ),
    },
    {
      title: t(
        "Weather and one-offs move single years",
        "天氣與一次性事件會左右單一年份",
      ),
      body: t(
        "The ministry said that in the first half of 2020, pollution drifting in from upwind fell to under half its usual level during China's lockdowns, so not all of that year's gain was local. In 2023 the ministry's numbers rose from 12.4 to 13.7. A single year is a data point, not a trend; read the run of years.",
        "環境部指出，2020 年上半年中國封城，使境外傳輸的污染物降到過去同期的不到五成，因此當年的改善並非全來自本地。2023 年環境部的數字由 12.4 回升到 13.7。單一年份只是一個資料點，不是趨勢；請看整段年份。",
      ),
    },
    {
      title: t("The yardsticks changed", "標準與指標改變過"),
      body: t(
        "The annual standard was tightened from 15 to 12 µg/m³ on 30 September 2024, with 2030 as the target year. The ministry's AQI cut-offs were revised from January 2025 and recalculated only back to 2020, so counts of unhealthy days from before 2020 are not on the same footing as later ones.",
        "年平均標準於 2024 年 9 月 30 日由 15 加嚴為 12 µg/m³，預計 2030 年達標。AQI 分段點自 2025 年 1 月起調整，且只回溯計算到 2020 年，因此 2020 年以前的空品不良日數，與之後的並不在同一基準上。",
      ),
    },
    {
      title: t("Not every pollutant fell", "不是每種污染物都下降"),
      body: t(
        "Ozone is the harder problem. The ministry reported that eight-hour ozone became the main pollutant on unhealthy-air days from 2019, and in 2025 average hourly ozone rose 2 percent on 2024 while PM2.5 held at 12.8.",
        "臭氧更難處理。環境部指出，2019 年起臭氧八小時值成為空品不良日的主要污染物；2025 年每小時臭氧平均較 2024 年上升 2%，PM2.5 則持平在 12.8。",
      ),
    },
    {
      title: t("An average hides places", "平均會掩蓋地方差異"),
      body: t(
        "Central and southern Taiwan fell from 19.6 to 14.8 between 2019 and 2025, yet it is still above the national 12.8. By county, Yunlin recorded the highest PM2.5 average in 2013 (34.0) and again in 2023 (19.3): down 43% and still the highest. Taitung was lowest in 2013, at 10.9.",
        "中南部在 2019 至 2025 年間由 19.6 降到 14.8，仍高於全國的 12.8。以縣市看，雲林縣 2013 年平均最高（34.0），2023 年（19.3）仍是最高：下降 43%，卻仍居首。臺東縣 2013 年最低，為 10.9。",
      ),
    },
  ];

  const questions = [
    t(
      "Why do the ministry (12.8) and IQAir (13.3) differ for 2025? Which would you use to test compliance with the standard, and why?",
      "2025 年環境部（12.8）與 IQAir（13.3）為何不同？要檢驗是否達標，你會用哪一個，為什麼？",
    ),
    t(
      "What evidence beyond this chart would you need to say that policy, rather than weather or upwind pollution, caused the fall?",
      "除了這張圖，還需要什麼證據，才能說下降來自政策，而不是天氣或境外污染？",
    ),
    t(
      "Yunlin fell by 43% and is still the highest county. Is “improved” the same as “healthy”? Compare 19.3 with the standard of 12 and the WHO guideline of 5.",
      "雲林縣下降 43%，卻仍是最高的縣市。「改善」等於「健康」嗎？請把 19.3 與標準 12、世界衛生組織建議值 5 相比。",
    ),
  ];

  const rows = Array.from(
    { length: yearSpan.last - yearSpan.first + 1 },
    (_, index) => yearSpan.first + index,
  ).map((year) => ({
    year,
    national: nationalPm25.find((point) => point.year === year),
    south: centralSouthPm25.find((point) => point.year === year),
  }));

  return (
    <main
      id="main"
      className="document-page teach air"
      data-subject="environment"
    >
      <p className="teach-crumb">
        <Link href="/environment">{t("Environment", "環境")}</Link>
        <span aria-hidden="true"> / </span>
        {t("Air over time", "空氣的長期變化")}
      </p>
      <header className="teach-head">
        <div className="teach-head-copy">
          <h1>{t("Has Taiwan’s air improved?", "臺灣的空氣有變好嗎？")}</h1>
          <p>
            {t(
              "Fine-particle (PM2.5) pollution has fallen by nearly half since 2013, measured the ministry’s standard way. Here is the record, what it can show, and where to be careful.",
              "以環境部的標準方法測量，細懸浮微粒（PM2.5）自 2013 年以來已下降近一半。以下是這段紀錄、它能說明什麼，以及需要小心之處。",
            )}
          </p>
        </div>
        <svg
          className="teach-island"
          viewBox={islandViewBox}
          aria-hidden="true"
          focusable="false"
        >
          <path d={islandPath} />
        </svg>
      </header>

      <ul className="air-facts">
        <li>
          <p className="air-num">{minus(drop)}</p>
          <p className="air-what">
            {t(
              `National annual average PM2.5, ${first.year} to ${last.year}`,
              `全國 PM2.5 年平均濃度，${first.year} 至 ${last.year} 年`,
            )}
          </p>
          <p className="air-detail">
            {one(first.value)} → {one(last.value)} µg/m³
          </p>
        </li>
        <li>
          <p className="air-num">{minus(southDrop)}</p>
          <p className="air-what">
            {t(
              `Central and southern Taiwan, ${southFirst.year} to ${southLast.year}`,
              `中南部地區，${southFirst.year} 至 ${southLast.year} 年`,
            )}
          </p>
          <p className="air-detail">
            {one(southFirst.value)} → {one(southLast.value)} µg/m³
            {t(", still above the national average", "，仍高於全國平均")}
          </p>
        </li>
        <li>
          <p className="air-num">
            {redAlerts[0].count} → {redAlerts[1].count}
          </p>
          <p className="air-what">
            {t(
              `PM2.5 red-alert station-days, ${redAlerts[0].year} to ${redAlerts[1].year}`,
              `PM2.5 紅色警示站日數，${redAlerts[0].year} 至 ${redAlerts[1].year} 年`,
            )}
          </p>
          <p className="air-detail">
            {t(
              "15 in 2020 (to 20 December, preliminary)",
              "2020 年降為 15（至 12 月 20 日，初步數字）",
            )}
          </p>
        </li>
      </ul>

      <section className="air-panel" aria-labelledby="air-chart-title">
        <div className="air-panel-head">
          <h2 id="air-chart-title">
            {t("Annual average PM2.5 in Taiwan", "臺灣 PM2.5 年平均濃度")}
          </h2>
          <p>
            {t(
              "µg/m³ · ministry standard method, 31 stations · lower is better",
              "µg/m³ · 環境部標準方法，31 個測站 · 數值越低越好",
            )}
          </p>
        </div>
        <AirChart />
        <p className="air-caption">
          {t(
            `${gapYears.join(" and ")} are not plotted: the ministry’s preliminary figures for those years could not be reconciled with its final series, so the atlas leaves a gap until the final annual values are added.`,
            `${gapYears.join("、")} 年未繪出：環境部這兩年的初步數字與最終數列無法對上，本平台在補上最終年值前先留空。`,
          )}
        </p>
        <details className="air-table">
          <summary>{t("See the numbers", "查看數字")}</summary>
          <table>
            <caption className="air-sr">
              {t("PM2.5 annual averages, µg/m³", "PM2.5 年平均濃度，µg/m³")}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("Year", "年")}</th>
                <th scope="col">{t("National", "全國")}</th>
                <th scope="col">{t("Central and south", "中南部")}</th>
                <th scope="col">{t("Note", "備註")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  <td>{row.national ? one(row.national.value) : "—"}</td>
                  <td>{row.south ? one(row.south.value) : "—"}</td>
                  <td>
                    {gapYears.includes(row.year)
                      ? t(
                          "Not plotted: preliminary figures could not be reconciled",
                          "未繪出：初步數字無法對上",
                        )
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="air-section" aria-labelledby="air-read">
        <h2 id="air-read">{t("How to read it", "如何解讀")}</h2>
        <ol className="air-notes">
          {notes.map((note) => (
            <li key={note.title}>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="air-class" aria-labelledby="air-class-title">
        <h2 id="air-class-title">{t("Questions for class", "課堂討論題")}</h2>
        <ol>
          {questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        <p className="air-next">
          <Link href="/environment">
            {t("Open the live air-quality map", "開啟即時空氣品質地圖")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/teach/air-quality-index">
            {t(
              "Lesson: Reading the Air Quality Index",
              "課程：讀懂空氣品質指標",
            )}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </p>
      </section>

      <section
        className="air-section air-sources"
        aria-labelledby="air-sources-title"
      >
        <h2 id="air-sources-title">{t("Sources", "資料來源")}</h2>
        <p>
          {t(
            "Every number on this page was copied by hand from the documents below; the atlas has no live archive of past air quality. Please check against the originals before citing. Two figures that differ between sources are never averaged: where releases disagreed, the year is left out.",
            "本頁每個數字都是從下列文件人工抄錄；本平台沒有過去空氣品質的即時存檔。引用前請對照原文。不同來源之間有出入的數字不會取平均：發布內容不一致的年份就不列入。",
          )}
        </p>
        <ul>
          {airSources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title[language]}
              </a>
              <span>
                {source.publisher} · {source.used[language]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <Footer />
    </main>
  );
}
