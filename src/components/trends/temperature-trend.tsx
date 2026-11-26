"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { temperatureSources } from "@/content/temperature-sources";
import { localiseSources } from "@/content/history-types";
import { temperatureHistory as data } from "@/data/temperature";
import {
  anomalies,
  baselinePeriod,
  countyChanges,
  degrees,
  firstYearOf,
  fullRecordCounties,
  hasFullRecord,
  islandSeries,
  periodChange,
  recentPeriod,
  seriesOf,
  smoothingYears,
  trailingMean,
  trendPerDecade,
  warmestYears,
  type YearValue,
} from "@/lib/temperature-history";
import { useLanguage } from "../providers";
import { LineChart } from "./line-chart";
import { TimePage, TimePanel } from "./time-page";
import "./temperature-trend.css";

const winterBaseline = { from: baselinePeriod.from + 1, to: baselinePeriod.to };
const one = (value: number | null) => (value === null ? "—" : value.toFixed(1));
const signed = (value: number | null) =>
  value === null ? "—" : degrees(value, true);

// Everything below depends only on the committed data file, so it is worked
// out once when the page loads, not on every render.
const withRecord = fullRecordCounties(data);
const annual = islandSeries(data, "annual");
const smooth = trailingMean(annual);
const summer = islandSeries(data, "summer");
const winter = islandSeries(data, "winter");
const annualChange = periodChange(annual);
const summerChange = periodChange(summer);
const winterChange = periodChange(winter, winterBaseline, recentPeriod);
const trend = trendPerDecade(annual);
const annualAnomaly = anomalies(annual);
const summerAnomaly = anomalies(summer);
const winterAnomaly = anomalies(winter, winterBaseline);
const summerSmooth = trailingMean(summerAnomaly);
const winterSmooth = trailingMean(winterAnomaly);
const changes = countyChanges(data);
const leftOut = data.counties.filter((county) => !hasFullRecord(county, data));
const topChange = Math.max(
  ...changes.map((row) => row.result?.change ?? 0),
  0.1,
);
// Two counties can fall in the same model square; their numbers then differ
// only by the small correction for each town's height.
const sharedSquares = Object.values(
  data.counties.reduce<Record<string, typeof data.counties>>(
    (groups, county) => {
      const key = `${county.gridLat.toFixed(2)},${county.gridLon.toFixed(2)}`;
      (groups[key] ??= []).push(county);
      return groups;
    },
    {},
  ),
).filter((group) => group.length > 1);
const years = Array.from(
  { length: data.lastYear - data.firstYear + 1 },
  (_, index) => data.firstYear + index,
);
const at = (points: YearValue[], year: number) =>
  points.find((point) => point.year === year)?.value ?? null;

export function TemperatureTrend() {
  const { language, t } = useLanguage();
  const [pickedCode, setPickedCode] = useState("");
  const name = (county: { zh: string; en: string }) =>
    language === "en" ? county.en : county.zh;

  const picked = withRecord.find((county) => county.code === pickedCode);
  const pickedSeries = useMemo(
    () => (picked ? seriesOf(picked, data, "annual") : null),
    [picked],
  );

  const top = warmestYears(annual, 1)[0];
  const tenWarmest = warmestYears(annual, 10);
  const recentOfTen = tenWarmest.filter(
    (point) => point.year >= recentPeriod.from,
  ).length;
  const count = withRecord.length;
  const leftOutNames = leftOut.map((county) => name(county));
  const joiner = t(" and ", "和");
  const leftOutText = leftOutNames.join(joiner);

  const sharedText = {
    en: sharedSquares
      .map(
        (group) =>
          ` ${group.map((county) => county.en).join(" and ")} fall in the same square, so their numbers are nearly the same.`,
      )
      .join(""),
    zh: sharedSquares
      .map(
        (group) =>
          `${group.map((county) => county.zh).join("和")}落在同一個網格，所以兩者的數字幾乎一樣。`,
      )
      .join(""),
  };

  const notes = [
    {
      title: t("A model, not a thermometer", "這是模型，不是溫度計的讀數"),
      body: t(
        "The numbers come from ERA5-Land, a computer reconstruction of the past: a land-surface model driven by a weather model that has been fed every observation available at the time. It is built to behave the same way from 1950 to now, which is why it suits questions about change. But it is not a station record, and early decades had far fewer observations to steer it, so the early years are the least certain. Check against the Central Weather Administration’s station records before quoting a single decimal.",
        "這些數字來自 ERA5-Land，是對過去的電腦重建：以陸地模型搭配天氣模型，並納入當時能取得的所有觀測。它的設計是讓 1950 年到現在的算法一致，所以適合用來看「變化」。但它不是測站紀錄，早年可用的觀測少得多，因此年代越早越不確定。要引用小數點後的數字，請先對照中央氣象署的測站紀錄。",
      ),
    },
    {
      title: t("One town stands for a whole county", "一個城鎮代表整個縣市"),
      body: t(
        "Each county is represented by the model’s grid square around its main town, about ten kilometres wide. A county with high mountains is far colder at the top than the town the model was asked about, and a 10 km square cannot show the extra heat of a city’s streets and buildings. The page shows how each place changed, not how hot the place is." +
          sharedText.en,
        "每個縣市以其主要城鎮所在的模型網格代表，網格寬約十公里。有高山的縣市，山上遠比所查詢的城鎮冷；十公里的網格也看不出城市街道與建築多出來的熱。本頁呈現的是各地「怎麼變」，不是各地「多熱」。" +
          sharedText.zh,
      ),
    },
    {
      title: t(
        "An average of places, with some left out",
        "是各地的平均，並有地方被排除",
      ),
      body: leftOut.length
        ? t(
            `The island line is the plain average of the ${count} counties with a full record, each counted once whatever its size. It is not weighted by area or population. The model returned no values for ${leftOutText}, so those are left out and shown as gaps. They are not filled in from a neighbour or another source.`,
            `全島的線是 ${count} 個有完整紀錄的縣市的簡單平均，每個縣市算一次，不論大小，也沒有依面積或人口加權。模型對${leftOutText}沒有回傳數值，所以排除並以空白呈現，沒有用鄰近地區或其他來源補上。`,
          )
        : t(
            `The island line is the plain average of all ${count} counties, each counted once whatever its size. It is not weighted by area or population.`,
            `全島的線是全部 ${count} 個縣市的簡單平均，每個縣市算一次，不論大小，也沒有依面積或人口加權。`,
          ),
    },
    {
      title: t("Thirty years against thirty years", "三十年對比三十年"),
      body: t(
        `Single years bounce about, so the headline compares the average of ${recentPeriod.from}–${recentPeriod.to} with the average of ${baselinePeriod.from}–${baselinePeriod.to}, the first and last thirty years of the record. The thicker line is the ${smoothingYears}-year average: each point is that year and the nine before it, so it trails the weather instead of leading it. A winter is named for the January it ends in, which is why the winter series starts in ${firstYearOf(data, "winter")}.`,
        `單一年份起伏大，所以標題數字是把 ${recentPeriod.from}–${recentPeriod.to} 年的平均和 ${baselinePeriod.from}–${baselinePeriod.to} 年的平均相比，也就是紀錄中最早與最近的三十年。較粗的線是 ${smoothingYears} 年平均：每個點是該年與之前九年的平均，所以它落後於天氣而不是領先。冬季以其結束的那個一月命名，因此冬季數列從 ${firstYearOf(data, "winter")} 年開始。`,
      ),
    },
    {
      title: t("Warmer does not mean the same everywhere", "變暖並非處處一樣"),
      body: t(
        "Summers and winters, and different counties, moved by different amounts, and the county bars compare each town with itself. A town that warmed more is not a hotter town. Whether a few tenths of a degree matter depends on what is being asked: crops, health, water and energy each have their own thresholds.",
        "夏季與冬季、不同縣市的變化幅度各不相同，縣市長條圖是各城鎮和自己比。升溫較多的城鎮，不等於比較熱的城鎮。幾個零點幾度重不重要，要看問的是什麼：作物、健康、水資源與能源各有各的門檻。",
      ),
    },
  ];

  const questions = [
    t(
      "ERA5-Land is a model, not a station record. What would you compare it against before telling people how much Taiwan has warmed?",
      "ERA5-Land 是模型，不是測站紀錄。要告訴大家臺灣升溫多少之前，你會拿它和什麼比對？",
    ),
    t(
      "Summers and winters warmed by different amounts. Which matters more for farms, for health or for the water supply, and who would you ask?",
      "夏季與冬季的升溫幅度不同。對農業、健康或水資源，哪一個更重要？你會問誰？",
    ),
    t(
      leftOut.length
        ? `The model has no values for ${leftOutText}. Should the page call the average of the other ${count} “Taiwan”? What would you write in the caption?`
        : "Every county has a value here. What other gaps could still hide in an average of places?",
      leftOut.length
        ? `模型沒有${leftOutText}的數值。本頁可以把其餘 ${count} 個縣市的平均稱為「臺灣」嗎？圖說你會怎麼寫？`
        : "這裡每個縣市都有數值。在各地的平均裡，還可能藏著哪些缺口？",
    ),
  ];

  const yearRows = years.map((year) => {
    const row: (string | number)[] = [
      year,
      one(at(annual, year)),
      one(at(smooth, year)),
      signed(at(annualAnomaly, year)),
    ];
    if (pickedSeries) row.push(one(at(pickedSeries, year)));
    return row;
  });
  const yearHead = [
    t("Year", "年"),
    t("That year (°C)", "該年（°C）"),
    t(`${smoothingYears}-year average (°C)`, `${smoothingYears} 年平均（°C）`),
    t(
      `Against ${baselinePeriod.from}–${baselinePeriod.to} (°C)`,
      `相對 ${baselinePeriod.from}–${baselinePeriod.to}（°C）`,
    ),
  ];
  if (picked) yearHead.push(`${name(picked)} (°C)`);

  const seasonRows = years.map((year) => [
    year,
    one(at(summer, year)),
    signed(at(summerAnomaly, year)),
    one(at(winter, year)),
    signed(at(winterAnomaly, year)),
  ]);

  const countyRows = changes.map(({ county, result }) => [
    name(county),
    language === "en" ? county.town : county.townZh,
    `${county.gridLat.toFixed(1)}, ${county.gridLon.toFixed(1)}`,
    county.elevationM,
    one(result?.before ?? null),
    one(result?.after ?? null),
    signed(result?.change ?? null),
  ]);

  const summerAbove = summerChange ? degrees(summerChange.change, true) : "—";
  const winterAbove = winterChange ? degrees(winterChange.change, true) : "—";

  return (
    <TimePage
      section="environment"
      tab="temperature"
      crumb={t("Temperature over time", "氣溫的變化")}
      title={t("Is Taiwan getting warmer?", "臺灣有變暖嗎？")}
      lede={t(
        `A computer reconstruction of the weather puts Taiwan’s yearly temperature about ${annualChange ? degrees(annualChange.change) : "—"} °C higher in ${recentPeriod.from}–${recentPeriod.to} than in ${baselinePeriod.from}–${baselinePeriod.to}. Here is the record by year, by season and by county, and why it is a model and not a thermometer.`,
        `電腦重建的天氣顯示，臺灣 ${recentPeriod.from}–${recentPeriod.to} 年的年平均氣溫，比 ${baselinePeriod.from}–${baselinePeriod.to} 年高約 ${annualChange ? degrees(annualChange.change) : "—"} °C。以下依年份、季節與縣市呈現，並說明為什麼這是模型而不是溫度計的讀數。`,
      )}
      facts={[
        {
          num: annualChange ? `${degrees(annualChange.change, true)} °C` : "—",
          what: t(
            `Yearly average, ${recentPeriod.from}–${recentPeriod.to} compared with ${baselinePeriod.from}–${baselinePeriod.to}`,
            `年平均氣溫，${recentPeriod.from}–${recentPeriod.to} 年相較於 ${baselinePeriod.from}–${baselinePeriod.to} 年`,
          ),
          detail: annualChange
            ? t(
                `${one(annualChange.before)} → ${one(annualChange.after)} °C, an average of ${count} counties’ main towns`,
                `${one(annualChange.before)} → ${one(annualChange.after)} °C，${count} 個縣市主要城鎮的平均`,
              )
            : undefined,
        },
        {
          num: top ? String(top.year) : "—",
          what: t("The warmest year in the record", "紀錄中最暖的一年"),
          detail: top
            ? t(
                recentOfTen === tenWarmest.length
                  ? `${one(top.value)} °C on average. All ${tenWarmest.length} of the warmest years are ${recentPeriod.from} or later`
                  : `${one(top.value)} °C on average. ${recentOfTen} of the ${tenWarmest.length} warmest years are ${recentPeriod.from} or later`,
                recentOfTen === tenWarmest.length
                  ? `平均 ${one(top.value)} °C。最暖的 ${tenWarmest.length} 年全部在 ${recentPeriod.from} 年之後`
                  : `平均 ${one(top.value)} °C。最暖的 ${tenWarmest.length} 年中有 ${recentOfTen} 年在 ${recentPeriod.from} 年之後`,
              )
            : undefined,
        },
        {
          num: `${summerAbove} °C`,
          what: t(
            "Summers (June–August), the same comparison",
            "夏季（6–8 月），同樣的比較",
          ),
          detail: t(`Winters: ${winterAbove} °C`, `冬季：${winterAbove} °C`),
        },
      ]}
      notes={notes}
      questions={questions}
      next={[
        {
          href: "/environment/weather",
          label: t("See the weather now", "看此刻的天氣"),
        },
        {
          href: "/environment/air-over-time",
          label: t("Air over time", "空氣的變化"),
        },
      ]}
      sourcesIntro={t(
        `Weather data by Open-Meteo.com, under CC BY 4.0. Generated using Copernicus Climate Change Service information; the atlas averaged it by year, season and county and rounded it to a tenth of a degree. Neither the European Commission nor ECMWF is responsible for how it is used here. The numbers were fetched once and are kept in the repository, so this page does not call Open-Meteo while you read it.`,
        `氣象資料由 Open-Meteo.com 提供，採 CC BY 4.0 授權。使用哥白尼氣候變遷服務（C3S）資訊產生；本平台依年、季節與縣市做平均，並四捨五入到小數點後一位。歐盟執委會與 ECMWF 不對這裡的使用方式負責。數字只取得一次並存放在程式庫中，讀這一頁時不會連到 Open-Meteo。`,
      )}
      sources={localiseSources(temperatureSources, language)}
    >
      <TimePanel
        id="tt-year"
        title={t("Yearly average temperature", "年平均氣溫")}
        sub={t(
          `°C · average of ${count} counties’ main towns · modelled`,
          `°C · ${count} 個縣市主要城鎮的平均 · 模型資料`,
        )}
        caption={
          <>
            {t(
              `Dots are single years; the thick line is the ${smoothingYears}-year average; the dashed line is the ${baselinePeriod.from}–${baselinePeriod.to} average.`,
              `圓點是單一年份；粗線是 ${smoothingYears} 年平均；虛線是 ${baselinePeriod.from}–${baselinePeriod.to} 年的平均。`,
            )}
            {trend !== null &&
              t(
                ` A straight line through all the years rises about ${degrees(trend)} °C a decade.`,
                ` 一條穿過所有年份的直線，每十年約上升 ${degrees(trend)} °C。`,
              )}
            <span className="tt-credit">
              {" "}
              <a href="https://open-meteo.com/">
                {t(
                  "Weather data by Open-Meteo.com",
                  "氣象資料：Open-Meteo.com",
                )}
              </a>
              {t(" (CC BY 4.0).", "（CC BY 4.0）。")}
            </span>
          </>
        }
        table={{
          caption: t(
            "Yearly average temperature in Taiwan, modelled",
            "臺灣年平均氣溫（模型資料）",
          ),
          head: yearHead,
          rows: yearRows,
        }}
      >
        <div className="tt-pick">
          <label htmlFor="tt-county">
            {t("Add one county to the chart", "在圖上加入一個縣市")}
          </label>
          <select
            id="tt-county"
            value={pickedCode}
            onChange={(event) => setPickedCode(event.target.value)}
          >
            <option value="">{t("None", "不加")}</option>
            {data.counties.map((county) => {
              const complete = hasFullRecord(county, data);
              return (
                <option
                  key={county.code}
                  value={county.code}
                  disabled={!complete}
                >
                  {name(county)}
                  {complete
                    ? ""
                    : t(" (no data in this model)", "（模型沒有數值）")}
                </option>
              );
            })}
          </select>
        </div>
        <LineChart
          summary={t(
            `Line chart of Taiwan’s yearly average temperature from ${one(at(annual, data.firstYear))} °C in ${data.firstYear} to ${one(at(annual, data.lastYear))} °C in ${data.lastYear}, with a ${smoothingYears}-year average.`,
            `臺灣年平均氣溫折線圖，從 ${data.firstYear} 年的 ${one(at(annual, data.firstYear))} °C，到 ${data.lastYear} 年的 ${one(at(annual, data.lastYear))} °C，並附 ${smoothingYears} 年平均。`,
          )}
          scrubLabel={t(
            "Read the chart year by year. Use the left and right arrow keys.",
            "逐年讀取圖表。請使用左右方向鍵。",
          )}
          series={[
            {
              key: "year",
              label: t("Each year", "各年"),
              points: annual,
              tone: "soft",
              dots: true,
            },
            {
              key: "smooth",
              label: t(
                `${smoothingYears}-year average`,
                `${smoothingYears} 年平均`,
              ),
              points: smooth,
              tone: "accent",
            },
            ...(picked && pickedSeries
              ? [
                  {
                    key: "county",
                    label: name(picked),
                    points: pickedSeries,
                    tone: "warm" as const,
                    dashed: true,
                  },
                ]
              : []),
          ]}
          firstYear={data.firstYear}
          lastYear={data.lastYear}
          unit="°C"
          format={(value) => value.toFixed(1)}
          reference={
            annualChange
              ? {
                  value: annualChange.before,
                  label: t(
                    `${baselinePeriod.from}–${baselinePeriod.to} average, ${one(annualChange.before)}`,
                    `${baselinePeriod.from}–${baselinePeriod.to} 年平均 ${one(annualChange.before)}`,
                  ),
                  short: t(
                    `${baselinePeriod.from}–${String(baselinePeriod.to).slice(2)} average`,
                    `${baselinePeriod.from}–${String(baselinePeriod.to).slice(2)} 年平均`,
                  ),
                }
              : undefined
          }
        />
      </TimePanel>

      <TimePanel
        id="tt-seasons"
        title={t("Summers and winters", "夏季與冬季")}
        sub={t(
          `°C above or below each season’s ${baselinePeriod.from}–${baselinePeriod.to} average · ${smoothingYears}-year averages`,
          `°C，相對於各季節 ${baselinePeriod.from}–${baselinePeriod.to} 年平均的高低 · ${smoothingYears} 年平均`,
        )}
        caption={t(
          `Winter is December to February, named for its January, so its first average covers ${winterBaseline.from}–${winterBaseline.to}. Yearly values are in the table; the lines are smoothed so the two seasons can be read side by side.`,
          `冬季為 12 月至 2 月，以其一月命名，所以它的基準平均涵蓋 ${winterBaseline.from}–${winterBaseline.to} 年。各年數值見表格；圖上的線經過平滑，方便並排比較兩個季節。`,
        )}
        table={{
          caption: t(
            "Summer and winter average temperature in Taiwan, modelled",
            "臺灣夏季與冬季平均氣溫（模型資料）",
          ),
          head: [
            t("Year", "年"),
            t("Summer (°C)", "夏季（°C）"),
            t("Summer against its base (°C)", "夏季相對基準（°C）"),
            t("Winter (°C)", "冬季（°C）"),
            t("Winter against its base (°C)", "冬季相對基準（°C）"),
          ],
          rows: seasonRows,
        }}
      >
        <LineChart
          summary={t(
            `Line chart of the ${smoothingYears}-year average summer and winter temperature compared with the ${baselinePeriod.from}–${baselinePeriod.to} average. Summers are ${summerAbove} °C and winters ${winterAbove} °C in ${recentPeriod.from}–${recentPeriod.to}.`,
            `夏季與冬季 ${smoothingYears} 年平均氣溫，相對 ${baselinePeriod.from}–${baselinePeriod.to} 年平均的折線圖。${recentPeriod.from}–${recentPeriod.to} 年夏季${summerAbove} °C，冬季${winterAbove} °C。`,
          )}
          scrubLabel={t(
            "Read the chart year by year. Use the left and right arrow keys.",
            "逐年讀取圖表。請使用左右方向鍵。",
          )}
          series={[
            {
              key: "summer",
              label: t("Summer (Jun–Aug)", "夏季（6–8 月）"),
              points: summerSmooth,
              tone: "warm",
              endLabel: true,
            },
            {
              key: "winter",
              label: t("Winter (Dec–Feb)", "冬季（12–2 月）"),
              points: winterSmooth,
              tone: "accent",
              dashed: true,
              endLabel: true,
            },
          ]}
          firstYear={data.firstYear}
          lastYear={data.lastYear}
          unit="°C"
          format={(value) => degrees(value, true)}
          reference={{
            value: 0,
            label: t("0 = the early average", "0 = 早期平均"),
            short: t("0 = early average", "0 = 早期平均"),
          }}
        />
      </TimePanel>

      <TimePanel
        id="tt-counties"
        title={t("County by county", "各縣市比較")}
        sub={t(
          `Change in the yearly average, ${baselinePeriod.from}–${baselinePeriod.to} to ${recentPeriod.from}–${recentPeriod.to} · °C`,
          `年平均氣溫的變化，${baselinePeriod.from}–${baselinePeriod.to} 年到 ${recentPeriod.from}–${recentPeriod.to} 年 · °C`,
        )}
        caption={t(
          "Each bar compares one town with itself, so it says how much a place changed, not how hot it is. Hatched rows are counties the model returned no values for.",
          "每根長條都是一個城鎮和自己比，說明的是變化多少，而不是多熱。斜線的列是模型沒有回傳數值的縣市。",
        )}
        table={{
          caption: t(
            "Modelled temperature change by county",
            "各縣市氣溫變化（模型資料）",
          ),
          head: [
            t("County", "縣市"),
            t("Town used", "所用城鎮"),
            t("Model grid centre", "模型網格中心"),
            t("Model elevation (m)", "模型海拔（公尺）"),
            t(
              `${baselinePeriod.from}–${baselinePeriod.to} (°C)`,
              `${baselinePeriod.from}–${baselinePeriod.to}（°C）`,
            ),
            t(
              `${recentPeriod.from}–${recentPeriod.to} (°C)`,
              `${recentPeriod.from}–${recentPeriod.to}（°C）`,
            ),
            t("Change (°C)", "變化（°C）"),
          ],
          rows: countyRows,
        }}
      >
        <ol
          className="tt-bars"
          aria-label={t(
            "Temperature change by county, largest first",
            "各縣市氣溫變化，由大到小",
          )}
        >
          {changes.map(({ county, result }) => (
            <li key={county.code} data-empty={result ? undefined : ""}>
              <span className="tt-name">
                {name(county)}
                <span className="tp-sr">
                  {result
                    ? `: ${degrees(result.change, true)} °C`
                    : t(": no data in this model", "：模型沒有數值")}
                </span>
              </span>
              <span className="tt-track" aria-hidden="true">
                {result && (
                  <span
                    className="tt-fill"
                    style={
                      {
                        "--v": Math.max(result.change, 0) / topChange,
                      } as CSSProperties
                    }
                  />
                )}
              </span>
              <span className="tt-num" aria-hidden="true">
                {result ? degrees(result.change, true) : t("no data", "無數值")}
              </span>
            </li>
          ))}
        </ol>
      </TimePanel>
    </TimePage>
  );
}
