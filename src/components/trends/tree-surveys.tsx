"use client";
import { localiseSources } from "@/content/history-types";
import { urbanSources, yearSummaries } from "@/content/year-data";
import { useLanguage } from "../providers";
import { BarChart } from "./bar-chart";
import { TimePage, TimePanel } from "./time-page";

const num = (value: number) => value.toLocaleString("en-US");
/** Short labels for the bars; the table beside them has every digit. */
const compact = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

export function TreeSurveys() {
  const { language, t } = useLanguage();
  const { park, riverside } = yearSummaries.trees;

  const parkYears = Array.from(
    {
      length:
        Number(park.lastDate.slice(0, 4)) -
        Number(park.firstDate.slice(0, 4)) +
        1,
    },
    (_, index) => Number(park.firstDate.slice(0, 4)) + index,
  );
  const parkCount = (year: number) => park.byYear[String(year)] ?? null;
  const emptyYears = parkYears.filter((year) => parkCount(year) === null);
  const emptyFrom = emptyYears[0];
  const emptyTo = emptyYears[emptyYears.length - 1];

  const dated = park.total - park.undated;
  const busy = parkYears.filter((year) => year >= 2022 && year <= 2025);
  const busyTotal = busy.reduce((sum, year) => sum + (parkCount(year) ?? 0), 0);
  const busyShare = Math.round((busyTotal / dated) * 100);
  const lastYear = parkYears[parkYears.length - 1];
  const lastMonthDay = park.lastDate.slice(5);
  const lastDateText = new Date(
    `${park.lastDate}T00:00:00Z`,
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const lastDateZh = `${lastYear} 年 ${Number(lastMonthDay.slice(0, 2))} 月 ${Number(lastMonthDay.slice(3))} 日`;
  const lastDateLabel = language === "en" ? lastDateText : lastDateZh;

  const riverYears = Object.keys(riverside.byYear)
    .map(Number)
    .sort((a, b) => a - b);
  const riverDated = riverside.total - riverside.undated;
  const riverFirst = riverside.byYear[String(riverYears[0])];

  return (
    <TimePage
      section="plants"
      tab="surveys"
      crumb={t("Counted year by year", "逐年盤點")}
      title={t(
        "Are Taipei’s trees increasing year by year? What survey dates can and cannot say",
        "臺北的樹逐年增加嗎？調查日期能說什麼、不能說什麼",
      )}
      lede={t(
        `Taipei’s tree files carry a date on almost every record. It is tempting to chart them as “trees per year”. This page charts them and then explains why they are survey dates, not a count of how many trees there were.`,
        `臺北的樹木資料，幾乎每一筆都有日期。很容易把它畫成「每年的樹木數量」。本頁畫出這張圖，並說明為什麼這些是調查日期，而不是樹木數量。`,
      )}
      facts={[
        {
          num: `${busyShare}%`,
          what: t(
            `Of dated park-tree records fall in ${busy[0]}–${busy[busy.length - 1]}`,
            `有日期的公園樹木紀錄中，落在 ${busy[0]}–${busy[busy.length - 1]} 年的比例`,
          ),
          detail: t(
            `${num(busyTotal)} of ${num(dated)} dated records`,
            `${num(dated)} 筆有日期的紀錄中的 ${num(busyTotal)} 筆`,
          ),
        },
        {
          num: String(emptyYears.length),
          what: t(
            `Years with no dated park-tree record, ${emptyFrom} to ${emptyTo}`,
            `沒有任何公園樹木日期紀錄的年份，${emptyFrom} 至 ${emptyTo} 年`,
          ),
          detail: t(
            "A silence in the file, not proof that nothing happened",
            "是檔案裡的空白，不代表那些年什麼都沒發生",
          ),
        },
        {
          num: `${num(riverFirst)} of ${num(riverDated)}`,
          what: t(
            `Riverside-tree records dated ${riverYears[0]}, from one survey that ran to June ${riverYears[1]}`,
            `河濱樹木紀錄註明 ${riverYears[0]} 年的筆數，來自一次延續到 ${riverYears[1]} 年 6 月的調查`,
          ),
          detail: t(
            "The file was updated in 2023 without a new survey",
            "檔案在 2023 年更新過，但並非重新調查",
          ),
        },
      ]}
      notes={[
        {
          title: t(
            "A survey date is not a planting date",
            "調查日期不是種植日期",
          ),
          body: t(
            "Each record says when that tree was surveyed. It does not say when the tree was planted, whether it is still standing, or how its canopy has changed, and this atlas’s data notes caution against reading it that way.",
            "每一筆紀錄寫的是那棵樹是何時調查的，沒有說它是何時種下、現在是否還在、樹冠如何變化，本平台的資料說明也提醒不要這樣解讀。",
          ),
        },
        {
          title: t(
            "The bars count records, not trees that existed",
            "長條數的是紀錄，不是當年存在的樹",
          ),
          body: t(
            `If you read “${num(park.byYear["2023"] ?? 0)} in 2023” as 2023’s trees, the city seems to have gained ${num(park.byYear["2023"] ?? 0)} trees in a year. It means ${num(park.byYear["2023"] ?? 0)} records carry a 2023 survey date. Most of the file was dated in just four years, which looks like a survey schedule.`,
            `如果把「2023 年 ${num(park.byYear["2023"] ?? 0)} 筆」讀成 2023 年的樹木數，會以為市區一年多了 ${num(park.byYear["2023"] ?? 0)} 棵樹。實際上是有 ${num(park.byYear["2023"] ?? 0)} 筆紀錄的調查日期是 2023 年。檔案的大部分只集中在四年內註記日期，看起來像是調查的輪次安排。`,
          ),
        },
        {
          title: t(
            `${emptyFrom} to ${emptyTo} are empty, and shown as gaps`,
            `${emptyFrom} 至 ${emptyTo} 年是空白，並以空缺呈現`,
          ),
          body: t(
            `No park-tree record carries a date from ${emptyFrom} to ${emptyTo}. The file gives no reason, so the chart leaves those years blank instead of drawing a line through them or showing zeros.`,
            `${emptyFrom} 至 ${emptyTo} 年沒有任何公園樹木紀錄帶有日期。檔案沒有說明原因，所以圖上留白，不畫線穿過，也不顯示為零。`,
          ),
        },
        {
          title: t(
            `${lastYear} is only part of a year`,
            `${lastYear} 年只有一部分`,
          ),
          body: t(
            `The latest park-tree date is ${lastDateText}, so the ${lastYear} bar covers less than the others.`,
            `最新的公園樹木日期是 ${lastDateZh}，所以 ${lastYear} 年的長條涵蓋的時間比其他年份少。`,
          ),
        },
        {
          title: t(
            "Records without a usable date are left out of the bars",
            "沒有可用日期的紀錄不在長條裡",
          ),
          body: t(
            `${num(park.undated)} park-tree records and ${riverside.undated} riverside records have a missing or invalid date, including spreadsheet default dates in 1899. They are kept in the totals and left out of the bars, rather than guessed.`,
            `${num(park.undated)} 筆公園樹木與 ${riverside.undated} 筆河濱樹木的日期缺漏或無效，包括試算表預設的 1899 年。它們列入總數，但不放進長條，也不推測。`,
          ),
        },
      ]}
      questions={[
        t(
          `The bars climb from ${num(park.byYear["2016"] ?? 0)} in 2016 to ${num(park.byYear["2023"] ?? 0)} in 2023. Explain in two sentences why that does not show Taipei gaining trees.`,
          `長條由 2016 年的 ${num(park.byYear["2016"] ?? 0)} 筆升到 2023 年的 ${num(park.byYear["2023"] ?? 0)} 筆。請用兩句話說明為什麼這不代表臺北的樹變多了。`,
        ),
        t(
          "Besides a survey date, what would you need to say whether one park’s trees increased between two years?",
          "除了調查日期，還需要什麼資料，才能說某個公園的樹在兩年之間是增加還是減少？",
        ),
        t(
          "The riverside file says it was updated in 2023, though the survey ran in 2016–2017. What does a “last updated” date tell you, and what does it not?",
          "河濱樹木檔案註明 2023 年更新，但調查是在 2016–2017 年。「最後更新」的日期能告訴你什麼，又不能告訴你什麼？",
        ),
      ]}
      next={[
        { href: "/plants", label: t("Browse the tree kinds", "瀏覽樹的種類") },
        {
          href: "/urban",
          label: t("Open the parks and trees map", "開啟公園與樹木地圖"),
        },
        {
          href: "/teach/audit-a-dataset",
          label: t("Lesson: Audit a dataset", "課程：檢查一份資料"),
        },
      ]}
      sourcesIntro={t(
        "Counts by survey year were made by this atlas from the two municipal files below. Both are Taipei only.",
        "各調查年的筆數由本平台從下列兩份市府資料計算；兩者都只涵蓋臺北。",
      )}
      sources={localiseSources(
        urbanSources.filter((source) => source.id !== "taipei-parks"),
        language,
      )}
    >
      <TimePanel
        id="ts-park"
        title={t(
          "Park trees, by the year they were surveyed",
          "公園樹木，依調查年份",
        )}
        sub={t(
          `${num(park.total)} records; ${num(park.undated)} have no usable date`,
          `共 ${num(park.total)} 筆；其中 ${num(park.undated)} 筆沒有可用日期`,
        )}
        caption={t(
          "Blank years are gaps in the file, not zeros. The numbers in the table are exact.",
          "空白的年份是檔案裡的空缺，不是零。表格中的數字是精確值。",
        )}
        table={{
          caption: t(
            "Park-tree records by survey year",
            "各調查年的公園樹木紀錄",
          ),
          head: [t("Year", "年"), t("Records", "紀錄筆數")],
          rows: [
            ...parkYears.map((year) => [
              year === lastYear
                ? `${year} (${t("to", "至")} ${lastDateLabel})`
                : String(year),
              parkCount(year) === null
                ? t("no records", "沒有紀錄")
                : num(parkCount(year) ?? 0),
            ]),
            [t("No usable date", "沒有可用日期"), num(park.undated)],
            [t("Total", "合計"), num(park.total)],
          ],
        }}
      >
        <BarChart
          label={t(
            "Park-tree records by survey year",
            "各調查年的公園樹木紀錄",
          )}
          empty={t("no records", "沒有紀錄")}
          format={compact}
          series={[
            { key: "records", label: t("Records", "紀錄"), tone: "accent" },
          ]}
          groups={parkYears.map((year) => ({
            key: String(year),
            label: String(year),
            sub: year === lastYear ? t("part year", "部分") : undefined,
            values: [parkCount(year)],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="ts-river"
        title={t("Riverside trees, from one survey", "河濱樹木，來自一次調查")}
        sub={t(
          `${num(riverside.total)} records, surveyed ${riverside.firstDate} to ${riverside.lastDate}`,
          `共 ${num(riverside.total)} 筆，調查期間 ${riverside.firstDate} 至 ${riverside.lastDate}`,
        )}
        caption={t(
          "One survey ran across two calendar years, so the split is where it happened to be on 1 January, not a change from one year to the next.",
          "同一次調查橫跨兩個日曆年，所以這個分法只是 1 月 1 日剛好進行到哪裡，不是年與年之間的變化。",
        )}
        table={{
          caption: t(
            "Riverside-tree records by survey year",
            "各調查年的河濱樹木紀錄",
          ),
          head: [t("Year", "年"), t("Records", "紀錄筆數")],
          rows: [
            ...riverYears.map((year) => [
              String(year),
              num(riverside.byYear[String(year)]),
            ]),
            [t("No usable date", "沒有可用日期"), num(riverside.undated)],
            [t("Total", "合計"), num(riverside.total)],
          ],
        }}
      >
        <BarChart
          label={t(
            "Riverside-tree records by survey year",
            "各調查年的河濱樹木紀錄",
          )}
          empty={t("no records", "沒有紀錄")}
          format={compact}
          series={[
            { key: "records", label: t("Records", "紀錄"), tone: "ink" },
          ]}
          groups={riverYears.map((year) => ({
            key: String(year),
            label: String(year),
            values: [riverside.byYear[String(year)]],
          }))}
        />
      </TimePanel>
    </TimePage>
  );
}
