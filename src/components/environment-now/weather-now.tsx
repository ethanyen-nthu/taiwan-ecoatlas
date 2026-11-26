"use client";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  summariseWeather,
  weatherByCounty,
  type CountyWeather,
} from "@/lib/live-summary";
import { sourceById } from "@/lib/sources";
import { useLanguage, useObservations } from "../providers";
import { Status, useFormatTime } from "../status";
import { TimePage, TimePanel } from "../trends/time-page";
import { HBars } from "./h-bars";
import "./environment-now.css";

type SortKey =
  | "county"
  | "stations"
  | "median"
  | "coolest"
  | "warmest"
  | "humidity"
  | "rain"
  | "wind";
type Sort = { key: SortKey; dir: 1 | -1 };

/** County names as the weather agency spells them, with English names. */
const english: Record<string, string> = {
  基隆市: "Keelung City",
  臺北市: "Taipei City",
  新北市: "New Taipei City",
  桃園市: "Taoyuan City",
  新竹市: "Hsinchu City",
  新竹縣: "Hsinchu County",
  苗栗縣: "Miaoli County",
  臺中市: "Taichung City",
  彰化縣: "Changhua County",
  南投縣: "Nantou County",
  雲林縣: "Yunlin County",
  嘉義市: "Chiayi City",
  嘉義縣: "Chiayi County",
  臺南市: "Tainan City",
  高雄市: "Kaohsiung City",
  屏東縣: "Pingtung County",
  宜蘭縣: "Yilan County",
  花蓮縣: "Hualien County",
  臺東縣: "Taitung County",
  澎湖縣: "Penghu County",
  金門縣: "Kinmen County",
  連江縣: "Lienchiang County",
};

export function WeatherNow() {
  const { language, t } = useLanguage();
  const formatTime = useFormatTime();
  const weather = useObservations("weather");
  const observations = useMemo(
    () => weather.data?.observations ?? [],
    [weather.data],
  );
  const overall = useMemo(() => summariseWeather(observations), [observations]);
  const counties = useMemo(() => weatherByCounty(observations), [observations]);
  const has = observations.length > 0;
  const name = (zh: string) => (language === "en" ? (english[zh] ?? zh) : zh);
  const where = (station: string, county: string | null) =>
    county ? `${station}, ${name(county)}` : station;
  const source = sourceById("weather");
  const [sort, setSort] = useState<Sort>({ key: "median", dir: -1 });

  const value = (row: CountyWeather, key: SortKey): number | string | null => {
    switch (key) {
      case "county":
        return name(row.county);
      case "stations":
        return row.stations;
      case "median":
        return row.medianTemperature;
      case "coolest":
        return row.coolest?.value ?? null;
      case "warmest":
        return row.warmest?.value ?? null;
      case "humidity":
        return row.medianHumidity;
      case "rain":
        return row.wettest?.value ?? null;
      case "wind":
        return row.windiest?.value ?? null;
    }
  };
  const sorted = useMemo(
    () =>
      [...counties].sort((a, b) => {
        const x = value(a, sort.key);
        const y = value(b, sort.key);
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return (
          (typeof x === "string"
            ? x.localeCompare(y as string)
            : x - (y as number)) * sort.dir
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counties, sort, language],
  );
  const byTemperature = useMemo(
    () =>
      counties
        .filter((row) => row.medianTemperature !== null)
        .sort((a, b) => b.medianTemperature! - a.medianTemperature!),
    [counties],
  );
  const rainy = useMemo(
    () =>
      [...observations]
        .filter((o) => (o.values.rainfall ?? 0) > 0)
        .sort((a, b) => b.values.rainfall! - a.values.rainfall!)
        .slice(0, 8),
    [observations],
  );
  const rainingStations = observations.filter(
    (o) => (o.values.rainfall ?? 0) > 0,
  ).length;

  const head = (key: SortKey, text: string) => (
    <th
      scope="col"
      aria-sort={
        sort.key === key
          ? sort.dir === 1
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() =>
          setSort((current) => ({
            key,
            dir:
              current.key === key
                ? ((current.dir * -1) as 1 | -1)
                : key === "county"
                  ? 1
                  : -1,
          }))
        }
      >
        {text}
        <ArrowUpDown size={13} aria-hidden="true" />
      </button>
    </th>
  );
  const cell = (number: number | null, digits: number) =>
    number === null ? (
      <td data-empty="true">
        <span aria-hidden="true">—</span>
        <span className="tp-sr">{t("No reading", "無讀數")}</span>
      </td>
    ) : (
      <td>{number.toFixed(digits)}</td>
    );

  const facts =
    has && overall.warmest && overall.coolest
      ? [
          {
            num: overall.stations.toLocaleString("en"),
            what: t(
              `Weather stations reporting, in ${counties.length} counties and cities`,
              `回報中的氣象測站，分布於 ${counties.length} 個縣市`,
            ),
            detail: t(
              `From two station networks; ${weather.data?.duplicates ?? 0} repeat readings of the same station were removed.`,
              `來自兩個測站網；已移除 ${weather.data?.duplicates ?? 0} 筆同一測站的重複讀數。`,
            ),
          },
          {
            num: `${overall.warmest.value.toFixed(1)} °C`,
            what: t(
              `Warmest station: ${where(overall.warmest.station, overall.warmest.county)}`,
              `最暖的測站：${where(overall.warmest.station, overall.warmest.county)}`,
            ),
            detail: t(
              `Middle station across the island: ${overall.medianTemperature!.toFixed(1)} °C.`,
              `全島中間測站：${overall.medianTemperature!.toFixed(1)} °C。`,
            ),
          },
          {
            num: `${overall.coolest.value.toFixed(1)} °C`,
            what: t(
              `Coolest station: ${where(overall.coolest.station, overall.coolest.county)}`,
              `最涼的測站：${where(overall.coolest.station, overall.coolest.county)}`,
            ),
            detail: t(
              "Stations sit at very different heights, so extremes mostly show where the stations are.",
              "各測站高度差異很大，極端值多半反映測站所在位置。",
            ),
          },
        ]
      : [];

  return (
    <TimePage
      section="environment"
      tab="weather"
      crumb={t("Weather now", "此刻的天氣")}
      title={t("What is the weather doing right now?", "此刻各地的天氣如何？")}
      lede={t(
        "The latest readings from the Central Weather Administration’s stations, county by county. Every figure is a measurement at a station, not a forecast and not a map drawn between stations.",
        "中央氣象署測站的最新讀數，依縣市整理。每個數字都是測站的實測值，不是預報，也不是在測站之間推算的地圖。",
      )}
      facts={facts}
      notes={[
        {
          title: t(
            "The middle station, not an average",
            "取中間測站，而非平均",
          ),
          body: t(
            "A county’s figure is the reading of its middle station (the median), with the coolest and warmest beside it. Stations are not spread evenly: mountain counties have dozens, some on high peaks, so a plain average would mostly describe where the stations happen to be.",
            "縣市的數字取其中間測站（中位數）的讀數，並列出最涼與最暖的測站。測站分布並不平均：山區縣市有數十個，有些在高山上，簡單平均只會反映測站剛好設在哪裡。",
          ),
        },
        {
          title: t("Two networks, counted once", "兩個測站網，每站只算一次"),
          body: t(
            "The agency runs staffed stations and automatic stations, published as two datasets. Where the same station appears in both, the newer reading is kept and counted once.",
            "氣象署有人工站與自動站，分成兩份資料發布。同一測站若兩份都有，保留較新的讀數，只算一次。",
          ),
        },
        {
          title: t("Rain is a running total", "雨量是累積值"),
          body: t(
            "The rainfall column is the rain recorded so far today, not the rate right now. A station with 0.0 recorded no rain today; a dash means it sent no rainfall reading.",
            "雨量欄是今天到目前為止的累積雨量，不是此刻的雨勢。0.0 代表今天沒有雨；破折號代表該站沒有回報雨量。",
          ),
        },
        {
          title: t("Right now, not what is normal", "此刻，而非常態"),
          body: t(
            "A cold or warm reading here is weather, not climate. Saying whether today is unusual needs the agency’s long-run averages, which this atlas does not hold. For a long record, see how Taiwan’s air has changed.",
            "這裡讀數偏冷或偏暖是天氣，不是氣候。要說今天是否異常，需要氣象署的長期平均，本平台目前沒有收錄。長期紀錄請見臺灣空氣的變化。",
          ),
        },
      ]}
      questions={[
        t(
          "Why does this page give each county’s middle station instead of the average of its stations? Pick a county with mountains and work out how the two could differ.",
          "為什麼本頁給各縣市的中間測站，而不是測站平均？挑一個有高山的縣市，推想兩者會怎樣不同。",
        ),
        t(
          "Today’s warmest and coolest stations differ by many degrees. What would you need to know about the two stations before comparing them?",
          "今天最暖與最涼的測站相差好幾度。比較這兩個測站之前，你需要知道它們的哪些資訊？",
        ),
        t(
          "A station shows 0.0 mm of rain and another shows a dash. What is the difference, and why does it matter when counting how many stations are dry?",
          "一個測站雨量是 0.0 毫米，另一個是破折號。兩者有什麼差別？為什麼在計算有多少測站沒下雨時這很重要？",
        ),
      ]}
      next={[
        {
          href: "/environment/air-over-time",
          label: t("Air over time", "空氣的變化"),
        },
        {
          href: "/environment/reservoirs",
          label: t("Reservoirs now", "水庫現況"),
        },
      ]}
      sourcesIntro={t(
        "Station readings are from the Central Weather Administration’s open data, under the Open Government Data License, version 1.0. They are read live each time the page loads and are not stored as a history.",
        "測站讀數來自中央氣象署開放資料，採政府資料開放授權條款第 1 版。每次載入頁面時即時讀取，並不保存為歷史紀錄。",
      )}
      sources={[
        {
          id: "cwa-weather",
          title: t(
            "Weather station observations (O-A0003-001, O-A0001-001)",
            "氣象測站觀測（O-A0003-001、O-A0001-001）",
          ),
          publisher: t("Central Weather Administration", "中央氣象署"),
          url: source.url,
          used: t(
            "air temperature, humidity, rainfall, wind",
            "氣溫、濕度、雨量、風速",
          ),
        },
      ]}
    >
      <div className="now-bar" data-now-bar>
        <Status
          status={weather.data?.status}
          loading={weather.loading && !weather.data}
        />
        <p>
          {overall.latest
            ? t(
                `Newest reading ${formatTime(overall.latest)} (Taiwan time). Checked ${formatTime(weather.data?.checkedAt)}.`,
                `最新讀數 ${formatTime(overall.latest)}（臺灣時間）。查詢時間 ${formatTime(weather.data?.checkedAt)}。`,
              )
            : weather.loading
              ? t("Fetching the latest readings…", "正在取得最新讀數…")
              : t("No readings yet.", "尚無讀數。")}
        </p>
        <button type="button" onClick={weather.refresh}>
          {t("Refresh", "重新整理")}
        </button>
      </div>

      {!has && !weather.loading && (
        <div className="now-empty" role="status">
          <p>
            {weather.data?.status === "not-configured"
              ? t(
                  "The weather feed is not set up on this site, so there is nothing to show.",
                  "本站尚未設定氣象資料來源，因此沒有可顯示的內容。",
                )
              : t(
                  "The weather feed is not answering right now, so there is nothing to show. Nothing is estimated in its place.",
                  "氣象資料目前沒有回應，因此沒有可顯示的內容，也不會以估算取代。",
                )}
          </p>
        </div>
      )}

      {has && (
        <>
          <TimePanel
            id="wx-temp"
            title={t(
              "Air temperature by county, middle station",
              "各縣市氣溫（中間測站）",
            )}
            sub={t(
              "Warmest county first. Bars start at 0 °C.",
              "最暖的縣市在前。長條由 0 °C 起算。",
            )}
          >
            <HBars
              label={t(
                "Middle-station temperature by county",
                "各縣市中間測站氣溫",
              )}
              max={Math.max(
                40,
                ...byTemperature.map((r) => r.medianTemperature!),
              )}
              empty={t("No reading", "無讀數")}
              rows={byTemperature.map((row) => ({
                key: row.county,
                label: name(row.county),
                sub: t(
                  `${row.stations} stations, ${row.coolest!.value.toFixed(1)} to ${row.warmest!.value.toFixed(1)} °C`,
                  `${row.stations} 個測站，${row.coolest!.value.toFixed(1)} 至 ${row.warmest!.value.toFixed(1)} °C`,
                ),
                value: row.medianTemperature,
                text: `${row.medianTemperature!.toFixed(1)} °C`,
              }))}
            />
          </TimePanel>

          <section className="tp-panel" aria-labelledby="wx-table">
            <div className="tp-panel-head">
              <h2 id="wx-table">
                {t("Every measure, county by county", "各縣市的每項測量")}
              </h2>
              <p>
                {t(
                  "Select a column heading to sort. Humidity is the middle station’s; rain and wind are the highest at any station in the county.",
                  "點選欄名排序。濕度為中間測站的值；雨量與風速為該縣市所有測站中的最高值。",
                )}
              </p>
            </div>
            <div
              className="now-table-wrap"
              role="region"
              tabIndex={0}
              aria-label={t("Weather by county", "各縣市天氣")}
            >
              <table className="now-table">
                <caption className="tp-sr">
                  {t("Latest weather readings by county", "各縣市最新天氣讀數")}
                </caption>
                <thead>
                  <tr>
                    {head("county", t("County", "縣市"))}
                    {head("stations", t("Stations", "測站數"))}
                    {head("median", t("Middle °C", "中間氣溫 °C"))}
                    {head("coolest", t("Coolest °C", "最涼 °C"))}
                    {head("warmest", t("Warmest °C", "最暖 °C"))}
                    {head("humidity", t("Humidity %", "濕度 %"))}
                    {head("rain", t("Rain today mm", "今日雨量 mm"))}
                    {head("wind", t("Wind m/s", "風速 m/s"))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.county}>
                      <th scope="row">{name(row.county)}</th>
                      <td>{row.stations}</td>
                      {cell(row.medianTemperature, 1)}
                      {cell(row.coolest?.value ?? null, 1)}
                      {cell(row.warmest?.value ?? null, 1)}
                      {cell(row.medianHumidity, 0)}
                      {cell(row.wettest?.value ?? null, 1)}
                      {cell(row.windiest?.value ?? null, 1)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tp-panel" aria-labelledby="wx-rain">
            <div className="tp-panel-head">
              <h2 id="wx-rain">
                {t("Where it has rained today", "今天哪裡下過雨")}
              </h2>
              <p>
                {rainingStations > 0
                  ? t(
                      `${rainingStations} of ${overall.stations} stations have recorded some rain so far today. The wettest ${rainy.length} are below.`,
                      `${overall.stations} 個測站中，有 ${rainingStations} 個今天到目前為止記錄到降雨。雨量最多的 ${rainy.length} 個列於下方。`,
                    )
                  : t(
                      "No station has recorded rain so far today.",
                      "今天到目前為止，沒有測站記錄到降雨。",
                    )}
              </p>
            </div>
            {rainy.length > 0 && (
              <HBars
                label={t(
                  "Rain so far today, wettest stations",
                  "今日累積雨量最多的測站",
                )}
                max={Math.max(10, ...rainy.map((o) => o.values.rainfall!))}
                empty={t("No reading", "無讀數")}
                rows={rainy.map((o) => ({
                  key: o.id,
                  label: o.station,
                  sub: o.county ? name(o.county) : undefined,
                  value: o.values.rainfall,
                  text: `${o.values.rainfall!.toFixed(1)} mm`,
                }))}
              />
            )}
          </section>
        </>
      )}
    </TimePage>
  );
}
