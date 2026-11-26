"use client";
import { localiseSources } from "@/content/history-types";
import { urbanSources, yearSummaries } from "@/content/year-data";
import { useLanguage } from "../providers";
import { BarChart } from "./bar-chart";
import { TimePage, TimePanel } from "./time-page";

const num = (value: number) => value.toLocaleString("en-US");
const ha2 = (value: number) => value.toFixed(2);

export function ParkYears() {
  const { language, t } = useLanguage();
  const { parks } = yearSummaries;

  // Parks recorded before 1960 are only three, so they share one group.
  const early = parks.byDecade.filter((row) => row.decade < 1960);
  const groups = [
    {
      key: "early",
      label: t("Before 1960", "1960 年以前"),
      sub: t(
        `${early.reduce((a, b) => a + b.parks, 0)} parks`,
        `${early.reduce((a, b) => a + b.parks, 0)} 座`,
      ),
      parks: early.reduce((a, b) => a + b.parks, 0),
      area: Math.round(early.reduce((a, b) => a + b.areaHa, 0) * 100) / 100,
    },
    ...parks.byDecade
      .filter((row) => row.decade >= 1960)
      .map((row) => ({
        key: String(row.decade),
        label: language === "en" ? `${row.decade}s` : `${row.decade} 年代`,
        sub: row.decade === 2020 ? t("to 2025", "至 2025") : undefined,
        parks: row.parks,
        area: row.areaHa,
      })),
  ];
  const peak = groups.reduce((a, b) => (b.parks > a.parks ? b : a));
  const biggestArea = groups.reduce((a, b) => (b.area > a.area ? b : a));
  const tenth = (key: string) => groups.find((row) => row.key === key);
  const seventies = tenth("1970");
  const eighties = tenth("1980");
  const nineties = tenth("1990");
  const twenties = tenth("2020");
  const middle =
    (seventies?.parks ?? 0) + (eighties?.parks ?? 0) + (nineties?.parks ?? 0);
  const middleShare = Math.round((middle / parks.withYear) * 100);
  const average = (row?: { parks: number; area: number }) =>
    row && row.parks > 0 ? row.area / row.parks : 0;
  const oldest = parks.oldest;
  const newest = parks.newest;

  return (
    <TimePage
      section="urban"
      tab="parks"
      crumb={t("Parks over time", "公園的年代")}
      title={t(
        "When did Taipei build its parks?",
        "臺北的公園是什麼時候建的？",
      )}
      lede={t(
        `Of the ${num(parks.total)} parks, squares and green spaces in Taipei’s open data, ${num(parks.withYear)} have a recorded construction year. Counted by decade, most were opened between the 1970s and 1990s.`,
        `臺北市開放資料中的 ${num(parks.total)} 座公園、廣場與綠地裡，有 ${num(parks.withYear)} 座記有開闢年份。依年代統計，多數是在 1970 到 1990 年代開闢的。`,
      )}
      facts={[
        {
          num: num(peak.parks),
          what: t(
            `Parks recorded as opened in the ${peak.label}, the most of any decade`,
            `記為在 ${peak.label}開闢的公園，是所有年代中最多的`,
          ),
          detail: t(
            `Against ${seventies?.parks ?? 0} in the 1970s, and ${twenties?.parks ?? 0} so far in the 2020s`,
            `1970 年代為 ${seventies?.parks ?? 0} 座，2020 年代至今為 ${twenties?.parks ?? 0} 座`,
          ),
        },
        {
          num: `${oldest.year} → ${newest.year}`,
          what: t(
            "Oldest and newest park with a recorded year",
            "有記載年份的最老與最新公園",
          ),
          detail: t(
            `${oldest.en} and ${newest.en}`,
            `${oldest.zh}與${newest.zh}`,
          ),
        },
        {
          num: `${num(parks.withYear)} of ${num(parks.total)}`,
          what: t(
            "Parks that have a construction year in the record",
            "紀錄中有開闢年份的公園",
          ),
          detail: t(
            `The other ${parks.withoutYear} are left out of every decade count`,
            `其餘 ${parks.withoutYear} 座不計入任何年代的統計`,
          ),
        },
      ]}
      notes={[
        {
          title: t(
            "Parks that exist today, sorted by their recorded year",
            "現今仍在的公園，依記載年份分類",
          ),
          body: t(
            "This is a list of what is in the city’s record now. A park that was closed, merged or renamed may not appear under its original decade, so the bars show how many of today’s parks date from each decade, not how many were ever made.",
            "這是城市紀錄中目前還在的清單。曾經關閉、合併或改名的公園，不一定會出現在它原本的年代，所以長條呈現的是「現在的公園有多少來自各年代」，不是當年總共開闢了多少。",
          ),
        },
        {
          title: t(
            "More parks and more land are different peaks",
            "公園座數最多與面積最大，不是同一個年代",
          ),
          body: t(
            `Most parks (${num(peak.parks)}) date from the ${peak.label}, but the most land (${ha2(biggestArea.area)} ha) from the ${biggestArea.label}. Average size shows why: ${ha2(average(eighties))} ha per park in the 1980s against ${ha2(average(seventies))} ha in the 1970s.`,
            `座數最多的是 ${peak.label}（${num(peak.parks)} 座），面積最大的是 ${biggestArea.label}（${ha2(biggestArea.area)} 公頃）。平均面積說明了原因：1980 年代平均每座 ${ha2(average(eighties))} 公頃，1970 年代為 ${ha2(average(seventies))} 公頃。`,
          ),
        },
        {
          title: t(
            "Three old parks are much larger than the rest",
            "三座老公園比其他的大得多",
          ),
          body: t(
            `The three parks recorded before 1960 cover ${ha2(groups[0].area)} ha between them, an average of ${ha2(average(groups[0]))} ha each, far above any later decade. Look at the average column in the table rather than at the bar for that group.`,
            `1960 年以前的三座公園合計 ${ha2(groups[0].area)} 公頃，平均每座 ${ha2(average(groups[0]))} 公頃，遠高於之後任何年代。請看表格的平均欄，而不是只看那一組的長條。`,
          ),
        },
        {
          title: t(
            "The 2020s are not a full decade",
            "2020 年代還不是完整的十年",
          ),
          body: t(
            `The newest park in the record is from ${newest.year}, so the ${twenties?.parks ?? 0} parks in the 2020s column cover six years, while every other column covers ten. Do not compare the heights directly.`,
            `紀錄中最新的公園是 ${newest.year} 年的，所以 2020 年代那一欄的 ${twenties?.parks ?? 0} 座只涵蓋六年，其他欄各涵蓋十年，不能直接比較高度。`,
          ),
        },
        {
          title: t(
            "Taipei only, and points rather than outlines",
            "只有臺北，且是點位而不是範圍",
          ),
          body: t(
            "The record covers Taipei, not the whole country. Each park is a reference point with an area written in the record, not a drawn boundary, and green space that is not listed as a park is not counted here.",
            "紀錄只涵蓋臺北，不是全國。每座公園是一個參考點加上紀錄中寫的面積，不是畫出來的邊界；沒有被列為公園的綠地也不在這裡的統計內。",
          ),
        },
      ]}
      questions={[
        t(
          `${middleShare}% of the dated parks come from just three decades, the 1970s to the 1990s. What would you want to know about Taipei in those years to explain it?`,
          `有年份的公園中，${middleShare}% 來自 1970 到 1990 年代這三個年代。想解釋這件事，你會想知道當時臺北的哪些情況？`,
        ),
        t(
          "The 1980s built many small parks and the 1970s fewer, larger ones. For a family living in a neighbourhood, which would you rather have nearby, and what would you measure to find out?",
          "1980 年代開闢了許多小公園，1970 年代則是較少、較大的公園。對住在社區裡的家庭，你比較希望附近是哪一種？你會量什麼來判斷？",
        ),
        t(
          "This list only has parks that still exist. What other record would you need to count parks that were closed or merged?",
          "這份清單只有現存的公園。要把已關閉或合併的公園也算進來，還需要什麼紀錄？",
        ),
      ]}
      next={[
        {
          href: "/urban",
          label: t("Open the parks and trees map", "開啟公園與樹木地圖"),
        },
        {
          href: "/teach/urban-green-and-heat",
          label: t("Lesson: Urban green and heat", "課程：都市綠地與熱"),
        },
        {
          href: "/plants/surveys",
          label: t("When the trees were counted", "樹是哪一年盤點的"),
        },
      ]}
      sourcesIntro={t(
        "The park records are the city’s open data. The decade totals and the average sizes were computed by this atlas from them.",
        "公園紀錄來自臺北市開放資料；各年代的合計與平均面積由本平台據此計算。",
      )}
      sources={localiseSources(
        urbanSources.filter((source) => source.id === "taipei-parks"),
        language,
      )}
    >
      <TimePanel
        id="pk-count"
        title={t(
          "Parks by the decade they were opened",
          "依開闢年代的公園座數",
        )}
        sub={t(
          `Parks with a recorded year, ${num(parks.withYear)} in all`,
          `有記載年份的公園，共 ${num(parks.withYear)} 座`,
        )}
        caption={t(
          "The 2020s bar covers six years; every other bar covers ten, except the first, which gathers three parks from 1899 to the 1950s.",
          "2020 年代只涵蓋六年；其他長條各涵蓋十年，第一條除外，它收的是 1899 年到 1950 年代的三座公園。",
        )}
        table={{
          caption: t("Parks by decade", "各年代公園"),
          head: [
            t("Decade", "年代"),
            t("Parks", "座數"),
            t("Total area (ha)", "總面積（公頃）"),
            t("Average per park (ha)", "平均每座（公頃）"),
          ],
          rows: groups.map((row) => [
            row.sub && row.key === "2020"
              ? `${row.label} (${row.sub})`
              : row.label,
            num(row.parks),
            ha2(row.area),
            ha2(average(row)),
          ]),
        }}
      >
        <BarChart
          label={t(
            "Parks by the decade they were opened",
            "依開闢年代的公園座數",
          )}
          empty={t("not given", "未提供")}
          series={[{ key: "parks", label: t("Parks", "座數"), tone: "accent" }]}
          groups={groups.map((row) => ({
            key: row.key,
            label: row.label,
            sub:
              row.key === "early"
                ? row.sub
                : row.key === "2020"
                  ? row.sub
                  : undefined,
            values: [row.parks],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="pk-area"
        title={t("How much land, by decade", "各年代開闢的面積")}
        sub={t(
          "Total area of those parks, hectares, as written in the record",
          "這些公園的總面積，公頃，依紀錄所載",
        )}
        caption={t(
          "Compare this with the chart above: more parks do not always mean more land.",
          "請與上一張圖對照：公園座數多，不一定面積就大。",
        )}
      >
        <BarChart
          label={t(
            "Total park area by decade opened, hectares",
            "依開闢年代的公園總面積，公頃",
          )}
          empty={t("not given", "未提供")}
          format={ha2}
          series={[{ key: "area", label: t("Hectares", "公頃"), tone: "ink" }]}
          groups={groups.map((row) => ({
            key: row.key,
            label: row.label,
            values: [row.area],
          }))}
        />
      </TimePanel>
    </TimePage>
  );
}
