"use client";
import { localiseSources, percentChange } from "@/content/history-types";
import {
  LIENCHIANG,
  wildlifeSources,
  yearSummaries,
} from "@/content/year-data";
import { useLanguage } from "../providers";
import { BarChart } from "./bar-chart";
import { HeatTable } from "./heat-table";
import { TimePage, TimePanel } from "./time-page";

const num = (value: number) => value.toLocaleString("en-US");
const pct = (value: number) => `${Math.round(value)}%`;

const classNames: Record<string, [string, string]> = {
  Amphibia: ["Frogs and other amphibians", "蛙類等兩棲類"],
  Reptilia: ["Snakes, lizards and other reptiles", "蛇、蜥蜴等爬蟲類"],
  Mammalia: ["Mammals", "哺乳類"],
  Aves: ["Birds", "鳥類"],
  Malacostraca: ["Crabs and other crustaceans", "螃蟹等甲殼類"],
};
const monthNames: [string, string][] = [
  ["January", "1 月"],
  ["February", "2 月"],
  ["March", "3 月"],
  ["April", "4 月"],
  ["May", "5 月"],
  ["June", "6 月"],
  ["July", "7 月"],
  ["August", "8 月"],
  ["September", "9 月"],
  ["October", "10 月"],
  ["November", "11 月"],
  ["December", "12 月"],
];

export function WildlifeYears() {
  const { language, t } = useLanguage();
  const lang = language === "en" ? 0 : 1;
  const { years, topCounties, records } = yearSummaries.wildlife;
  const first = years[0];
  const last = years[years.length - 1];
  const prior = years[years.length - 2];
  const yearLabels = years.map((row) => String(row.year));

  const lienchiang = topCounties.find((row) => row.code === LIENCHIANG);
  const lienLast = lienchiang?.byYear[String(last.year)] ?? 0;
  const lienPrior = lienchiang?.byYear[String(prior.year)] ?? 0;
  const lastWithout = last.records - lienLast;
  const priorWithout = prior.records - lienPrior;
  const withoutRise = percentChange(priorWithout, lastWithout);

  const amphibianShare = (row: (typeof years)[number]) =>
    (row.byClass.Amphibia / row.records) * 100;
  const warmShare = years.map(
    (row) =>
      (row.byMonth.slice(3, 10).reduce((sum, value) => sum + value, 0) /
        row.records) *
      100,
  );
  const warmFloor = Math.floor(Math.min(...warmShare));
  const earlyFirst = first.byMonth.slice(0, 3).reduce((a, b) => a + b, 0);
  const missingMonths = first.byMonth
    .map((value, index) => (value === 0 ? index : -1))
    .filter((index) => index >= 0);
  const missingText = missingMonths
    .map((index) => monthNames[index][lang])
    .join(language === "en" ? " and " : "、");

  return (
    <TimePage
      section="wildlife"
      tab="years"
      crumb={t("Year by year", "逐年比較")}
      title={t(
        "Is roadkill getting worse? What four years of records can and cannot say",
        "路死變多了嗎？四年的紀錄能說什麼、不能說什麼",
      )}
      lede={t(
        `The atlas’s roadkill records grew from ${num(first.records)} in ${first.year} to ${num(last.records)} in ${last.year}. That is a real change in the records. Whether it is a change in roadkill is a harder question, and this page shows why.`,
        `本平台的路死紀錄由 ${first.year} 年的 ${num(first.records)} 筆，增加到 ${last.year} 年的 ${num(last.records)} 筆。紀錄確實變多了，但路死是否真的變多，是更難回答的問題，本頁說明原因。`,
      )}
      facts={[
        {
          num: `${num(first.records)} → ${num(last.records)}`,
          what: t(
            `Roadkill records in the atlas, ${first.year} to ${last.year}`,
            `本平台的路死紀錄，${first.year} 至 ${last.year} 年`,
          ),
          detail: t(
            "More than three times as many records in four years",
            "四年間增加到三倍以上",
          ),
        },
        {
          num: `${num(lienLast)}`,
          what: t(
            `${last.year} records from Lienchiang County alone, up from ${lienPrior} in ${prior.year}`,
            `${last.year} 年僅連江縣就有這麼多筆，${prior.year} 年只有 ${lienPrior} 筆`,
          ),
          detail: t(
            `Without it, ${last.year} has ${num(lastWithout)} records, still ${withoutRise}% up on ${prior.year}’s ${num(priorWithout)}`,
            `扣掉連江縣，${last.year} 年仍有 ${num(lastWithout)} 筆，比 ${prior.year} 年的 ${num(priorWithout)} 筆多 ${withoutRise}%`,
          ),
        },
        {
          num: `${first.taxa} → ${last.taxa}`,
          what: t(
            "Kinds of animal recorded in a year",
            "一年中記錄到的動物種類數",
          ),
          detail: t(
            "More records meet more kinds, so this is not proof that more kinds are being killed",
            "紀錄越多，遇到的種類越多，這不代表被撞死的種類變多",
          ),
        },
      ]}
      notes={[
        {
          title: t(
            "Records measure looking as well as killing",
            "紀錄反映的是「有沒有人去看」，也反映路死本身",
          ),
          body: t(
            "Each record is a report by someone who found an animal and wrote it down. More volunteers, a better phone app, or a campaign in one county all add records without any more animals dying. The atlas’s own data notes say counts reflect reporting effort and screening, not abundance or corrected roadkill risk.",
            "每一筆紀錄都是有人發現動物並記下來。志工變多、手機程式變好用、某個縣市辦了一場活動，都會增加紀錄，即使死亡的動物沒有變多。本平台的資料說明也寫明：數量反映的是通報努力與篩選，而不是族群數量或校正後的路死風險。",
          ),
        },
        {
          title: t(
            `Part of ${last.year}’s jump is one county`,
            `${last.year} 年的跳升有一部分來自單一縣市`,
          ),
          body: t(
            `Lienchiang County went from ${lienPrior} records in ${prior.year} to ${num(lienLast)} in ${last.year}, so ${pct((lienLast / last.records) * 100)} of that year’s total comes from one county. That looks more like a counting effort starting than a sudden change on its roads, though the records alone cannot prove it. Even without it the rest of the island rose ${withoutRise}%, which is still large.`,
            `連江縣由 ${prior.year} 年的 ${lienPrior} 筆，變成 ${last.year} 年的 ${num(lienLast)} 筆，當年總數的 ${pct((lienLast / last.records) * 100)} 來自這一個縣。這看起來更像是開始有人在記錄，而不是那裡的道路突然改變，不過光憑紀錄無法證明。即使扣掉它，其餘地區仍增加 ${withoutRise}%，增幅依然很大。`,
          ),
        },
        {
          title: t(`${first.year} starts late`, `${first.year} 年起步較晚`),
          body: t(
            `The atlas has ${earlyFirst} records for January to March ${first.year} and none for ${missingText}. These records cannot say whether those were quiet months or months nobody was counting, so the tables show the empty months as gaps, not as zero roadkill.`,
            `本平台在 ${first.year} 年 1 至 3 月只有 ${earlyFirst} 筆紀錄，${missingText}則完全沒有。單從紀錄無法判斷那些月份是真的很少，還是沒有人在記錄，所以表格把空月份顯示為空缺，而不是零。`,
          ),
        },
        {
          title: t(
            "Warm months dominate every year",
            "每一年都以溫暖的月份為主",
          ),
          body: t(
            `In every year at least ${warmFloor}% of records fall between April and October. That fits frogs, snakes and lizards being more active when it is warm and wet, but people are also outdoors more then, so the records alone cannot separate the two.`,
            `每一年至少有 ${warmFloor}% 的紀錄落在 4 月到 10 月。這符合蛙類、蛇與蜥蜴在溫暖潮濕時較活躍，但這時人也較常在戶外，單看紀錄無法區分兩者。`,
          ),
        },
        {
          title: t("Frogs grew fastest", "蛙類成長最快"),
          body: t(
            `Amphibians were ${pct(amphibianShare(first))} of ${first.year}’s records and ${pct(amphibianShare(last))} of ${last.year}’s (${num(first.byClass.Amphibia)} to ${num(last.byClass.Amphibia)}). Frogs are small, numerous on wet roads and easy to count in one walk, so this could be about the animals, the roads or who was looking.`,
            `兩棲類占 ${first.year} 年紀錄的 ${pct(amphibianShare(first))}，到 ${last.year} 年升到 ${pct(amphibianShare(last))}（${num(first.byClass.Amphibia)} 筆增加到 ${num(last.byClass.Amphibia)} 筆）。蛙類體型小、在潮濕道路上數量多，一次步行就能數到，所以原因可能出在動物、道路，或是誰在找。`,
          ),
        },
        {
          title: t("This is a screened subset", "這是篩選過的子集"),
          body: t(
            `The source archive has 46,416 records from 2011 to 2017. The atlas publishes ${num(records)} of them, from 2014 on, after a privacy and conservation screening. It cannot show 2011–2013, and it is not the complete count of roadkill in Taiwan. The records stop at 2017.`,
            `來源資料庫有 46,416 筆（2011 至 2017 年）。本平台經隱私與保育篩選後，公開其中從 2014 年起的 ${num(records)} 筆。所以看不到 2011–2013 年，也不是臺灣路死的完整數字。紀錄止於 2017 年。`,
          ),
        },
      ]}
      questions={[
        t(
          "Records rose more than threefold in four years. Name three things other than more animals dying that could produce that.",
          "四年間紀錄增加到三倍以上。除了動物死得更多，請說出三個可能造成這個結果的原因。",
        ),
        t(
          `Lienchiang had ${lienPrior} records in ${prior.year} and ${num(lienLast)} in ${last.year}. What would you ask the people who collected them?`,
          `連江縣 ${prior.year} 年有 ${lienPrior} 筆，${last.year} 年有 ${num(lienLast)} 筆。你會問蒐集這些紀錄的人什麼問題？`,
        ),
        t(
          "If you were designing a count that could show whether roadkill is really rising, what would you keep the same from year to year?",
          "如果要設計一種能看出路死是否真的上升的計數，你會讓哪些條件年年保持一致？",
        ),
      ]}
      next={[
        {
          href: "/wildlife",
          label: t("Open the roadkill map", "開啟路死地圖"),
        },
        {
          href: "/teach/roadkill-and-counting-effort",
          label: t(
            "Lesson: Roadkill and counting effort",
            "課程：路死與計數的努力",
          ),
        },
      ]}
      sourcesIntro={t(
        "Every figure on this page was counted by this atlas from the records in its own screened subset of the dataset below. The page does not use any other roadkill source.",
        "本頁所有數字都是本平台從下列資料集的篩選子集中計算而得，沒有使用其他路死資料來源。",
      )}
      sources={localiseSources(wildlifeSources, language)}
    >
      <TimePanel
        id="wl-records"
        title={t("Records per year", "每年的紀錄筆數")}
        sub={t("Roadkill records in the atlas", "本平台中的路死紀錄")}
        caption={t(
          "These are records, not animals counted in a fixed way each year. See how to read them below.",
          "這是紀錄筆數，不是每年用固定方法點算的動物數。請見下方的解讀說明。",
        )}
        table={{
          caption: t("Records and kinds per year", "每年的紀錄與種類數"),
          head: [
            t("Year", "年"),
            t("Records", "紀錄筆數"),
            t("Kinds of animal", "動物種類數"),
            t("Records without Lienchiang", "不含連江縣的紀錄"),
          ],
          rows: years.map((row) => [
            String(row.year),
            num(row.records),
            row.taxa,
            num(row.records - (lienchiang?.byYear[String(row.year)] ?? 0)),
          ]),
        }}
      >
        <BarChart
          label={t("Roadkill records per year", "每年路死紀錄筆數")}
          empty={t("not given", "未提供")}
          series={[
            { key: "records", label: t("Records", "紀錄"), tone: "accent" },
          ]}
          groups={years.map((row) => ({
            key: String(row.year),
            label: String(row.year),
            values: [row.records],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="wl-counties"
        title={t("Where the records come from", "紀錄來自哪裡")}
        sub={t(
          "The eight counties with the most records, per year. Each row is tinted against its own largest year.",
          "紀錄最多的八個縣市，逐年。每一列以它自己最大的一年為深色。",
        )}
        caption={t(
          "The rows do not move together: compare Lienchiang, which jumps in the last year, with Taoyuan, which falls. That is why a national total can mislead.",
          "各列的走向並不一致：連江縣在最後一年暴增，桃園市卻下降。這就是全國總數可能誤導的原因。",
        )}
      >
        <HeatTable
          caption={t("Records by county and year", "各縣市逐年紀錄筆數")}
          corner={t("County", "縣市")}
          columns={yearLabels}
          totalLabel={t("All four years", "四年合計")}
          empty={t("no records", "沒有紀錄")}
          rows={topCounties.map((row) => ({
            key: row.code,
            label: row.name[language],
            values: years.map((year) => row.byYear[String(year.year)] ?? 0),
          }))}
        />
      </TimePanel>

      <TimePanel
        id="wl-classes"
        title={t("Which animals", "是哪些動物")}
        sub={t(
          "Records by animal group and year. Each row is tinted against its own largest year.",
          "各類動物逐年的紀錄筆數。每一列以它自己最大的一年為深色。",
        )}
        caption={t(
          "Every group has more records in the last year than in the first; frogs rise by far the most.",
          "每一類在最後一年的紀錄都比第一年多，其中蛙類增加最多。",
        )}
      >
        <HeatTable
          caption={t(
            "Records by animal group and year",
            "各類動物逐年紀錄筆數",
          )}
          corner={t("Animal group", "動物類群")}
          columns={yearLabels}
          totalLabel={t("All four years", "四年合計")}
          empty={t("no records", "沒有紀錄")}
          rows={Object.keys(classNames).map((key) => ({
            key,
            label: classNames[key][lang],
            values: years.map((year) => year.byClass[key] ?? 0),
          }))}
        />
      </TimePanel>

      <TimePanel
        id="wl-months"
        title={t("When in the year", "一年中的哪些月份")}
        sub={t(
          "Records by month and year. One scale for the whole table.",
          "各月份逐年的紀錄筆數。整張表使用同一個深淺尺度。",
        )}
        caption={t(
          `A dash means the atlas has no record for that month, not that no animal was killed. ${first.year} has none for ${missingText}.`,
          `破折號代表本平台那個月沒有任何紀錄，不代表沒有動物死亡。${first.year} 年的 ${missingText}沒有紀錄。`,
        )}
      >
        <HeatTable
          caption={t("Records by month and year", "各月份逐年紀錄筆數")}
          corner={t("Month", "月份")}
          columns={yearLabels}
          scale="table"
          empty={t("no records", "沒有紀錄")}
          rows={monthNames.map((month, index) => ({
            key: month[0],
            label: month[lang],
            values: years.map((year) => {
              const value = year.byMonth[index];
              return value === 0 ? null : value;
            }),
          }))}
        />
      </TimePanel>
    </TimePage>
  );
}
