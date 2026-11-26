"use client";
import { localiseSources, percentChange } from "@/content/history-types";
import {
  end2025,
  ownShares,
  peoples2025,
  places2025,
  plainsRegistration,
  populationSources,
  publishedGrowth2011to2020,
  yearEnds,
} from "@/content/population-history";
import { useLanguage } from "../providers";
import { BarChart } from "./bar-chart";
import { TimePage, TimePanel } from "./time-page";

const num = (value: number) => value.toLocaleString("en-US");
const pct1 = (value: number) => `${value.toFixed(1)}%`;

export function PopulationTrend() {
  const { language, t } = useLanguage();
  const first = yearEnds[0];
  const last = yearEnds[yearEnds.length - 1];
  const rise = percentChange(first.people, last.people);

  const listed = peoples2025.reduce((sum, row) => sum + row.people, 0);
  const everyoneElse = last.people - listed;
  const listedShare = Math.round((listed / last.people) * 100);
  const peopleRows = [
    ...peoples2025.map((row) => ({
      key: row.key,
      label: language === "en" ? row.en : row.zh,
      people: row.people,
      sharePct: row.sharePct,
    })),
    {
      key: "rest",
      label: t("Everyone else", "其餘所有人"),
      people: everyoneElse,
      sharePct: Number(((everyoneElse / last.people) * 100).toFixed(1)),
    },
  ];

  return (
    <TimePage
      section="culture"
      tab="population"
      crumb={t("Population over time", "人口的變化")}
      title={t(
        "How many Indigenous Taiwanese are there, and is it growing?",
        "臺灣原住民有多少人？人數在增加嗎？",
      )}
      lede={t(
        "People registered as Indigenous in Taiwan’s household registry rose from about 520 thousand at the end of 2011 to about 629 thousand at the end of 2025. Only three year-ends are shown here, because those are the ones traced to a published table.",
        "臺灣戶籍登記的原住民人口，由 2011 年底約 52 萬人，增加到 2025 年底約 63 萬人。這裡只呈現三個年底，因為只有這三個能追溯到公開發布的表格。",
      )}
      facts={[
        {
          num: `${num(first.people)} → ${num(last.people)}`,
          what: t(
            `Registered Indigenous people, end of ${first.year} to end of ${last.year}`,
            `戶籍登記原住民人口，${first.year} 年底至 ${last.year} 年底`,
          ),
          detail: t(`Up ${rise}% over fourteen years`, `十四年間增加 ${rise}%`),
        },
        {
          num: `${first.sharePct}% → ${last.sharePct}%`,
          what: t("Share of Taiwan’s whole population", "占全國人口的比例"),
          detail: t(
            `${yearEnds[1].sharePct}% at the end of ${yearEnds[1].year}`,
            `${yearEnds[1].year} 年底為 ${yearEnds[1].sharePct}%`,
          ),
        },
        {
          num: `${end2025.medianAge} vs ${end2025.nationalMedianAge}`,
          what: t(
            "Median age at the end of 2025: Indigenous people and everyone",
            "2025 年底的年齡中位數：原住民與全體國民",
          ),
          detail: t(
            "About eleven years younger than the national figure",
            "比全國數字年輕約 11 歲",
          ),
        },
      ]}
      notes={[
        {
          title: t("Three year-ends, not every year", "三個年底，不是每一年"),
          body: t(
            `The ministry publishes monthly counts back to 1999 (the source list links the open data). This page copies only the year-ends it could trace to a published table, and shows the gaps between them as gaps. The ministry says the count has risen in every year, so the missing years are not hiding a fall.`,
            `內政部公布自 1999 年起的逐月人口資料（資料來源列有開放資料連結）。本頁只抄錄能追溯到已公布表格的年底數字，並把中間的空缺如實呈現為空缺。內政部表示歷年人數皆呈增加趨勢，所以空缺的年份並沒有藏著下降。`,
          ),
        },
        {
          title: t(
            "Registered is not the same as identifies",
            "「登記」不等於「認同」",
          ),
          body: t(
            `These are people registered with Indigenous status. The ministry’s 2025 note counts 26 peoples: 16 legally recognised and 10 Plains (Pingpu) peoples. A law on Plains Indigenous status took effect on 23 October 2025, but registration first needs each people to be recognised, and the ministry says ${plainsRegistration.applied} of the ${plainsRegistration.ofTen} have applied. The 2025 breakdown by people covers the 16, so the count can change for administrative reasons as well as births.`,
            `這些是在戶籍登記為原住民身分的人。內政部 2025 年的說明指出，我國原住民族有 26 族：法定 16 族與平埔 10 族。2025 年 10 月 23 日公布施行的法律規範平埔原住民身分，但登記前須先經各族認定，內政部指出 10 族中已有 ${plainsRegistration.applied} 族提出申請。2025 年各族人數涵蓋的是法定 16 族，所以人數的變化除了出生，也可能來自行政上的變動。`,
          ),
        },
        {
          title: t("Faster growth than the whole country", "成長比全國快"),
          body: t(
            `From the end of 2011 to the end of 2020 the Indigenous count grew ${publishedGrowth2011to2020.indigenous}% and the whole population ${publishedGrowth2011to2020.nation}% (both as printed in Taichung City’s bulletin, from Ministry of the Interior data). The share therefore crept up from ${first.sharePct}% to ${yearEnds[1].sharePct}%, then ${last.sharePct}% in 2025.`,
            `從 2011 年底到 2020 年底，原住民人口成長 ${publishedGrowth2011to2020.indigenous}%，全體人口成長 ${publishedGrowth2011to2020.nation}%（皆為臺中市統計通報所列，資料來自內政部）。所以占比由 ${first.sharePct}% 緩慢升到 ${yearEnds[1].sharePct}%，2025 年為 ${last.sharePct}%。`,
          ),
        },
        {
          title: t(
            "A total hides three large peoples and thirteen smaller ones",
            "總數背後是三個大族與十三個較小的族",
          ),
          body: t(
            `Amis, Paiwan and Atayal together are ${num(listed)} people, or ${listedShare}% of the 2025 total. The “everyone else” bar is simply the total minus those three, so it includes the other thirteen legally recognised peoples; use the peoples guide for each of them.`,
            `阿美族、排灣族與泰雅族合計 ${num(listed)} 人，占 2025 年總數的 ${listedShare}%。「其餘所有人」是總數減去這三族，因此涵蓋其他十三個法定族群；每個族群的介紹請見族群導覽。`,
          ),
        },
        {
          title: t(
            "Count and share tell different stories by place",
            "各地的「人數」與「占比」說的是不同的事",
          ),
          body: t(
            `Hualien has the most registered Indigenous residents (${num(places2025[0].people)}), with Taoyuan close behind (${num(places2025[1].people)}). Measured against each county’s own residents, the order changes: ${ownShares[0].sharePct}% of Taitung, ${ownShares[1].sharePct}% of Hualien and ${ownShares[2].sharePct}% of Pingtung.`,
            `花蓮縣的登記原住民人數最多（${num(places2025[0].people)} 人），桃園市緊追在後（${num(places2025[1].people)} 人）。若以各縣市自己的居民為分母，順序就變了：臺東縣 ${ownShares[0].sharePct}%、花蓮縣 ${ownShares[1].sharePct}%、屏東縣 ${ownShares[2].sharePct}%。`,
          ),
        },
      ]}
      questions={[
        t(
          `The Indigenous count grew ${publishedGrowth2011to2020.indigenous}% in nine years while the whole population grew ${publishedGrowth2011to2020.nation}%. Give one reason that is about people being born and one that is about who is allowed to register.`,
          `原住民人口九年成長 ${publishedGrowth2011to2020.indigenous}%，全體人口只成長 ${publishedGrowth2011to2020.nation}%。請各舉一個與出生有關、與「誰可以登記」有關的原因。`,
        ),
        t(
          `Amis, Paiwan and Atayal are ${listedShare}% of the registered total. What does a report that only uses the single number “629 thousand” leave out?`,
          `阿美、排灣、泰雅占登記總數的 ${listedShare}%。只用「63 萬」這個單一數字的報告，會漏掉什麼？`,
        ),
        t(
          "Hualien has more Indigenous residents, Taitung a larger share of its own population. Which number would you use to plan a school service, and which to describe a community’s presence?",
          "花蓮的原住民居民較多，臺東的占比較高。規劃學校服務時你會用哪個數字？描述一個社群的存在感時又用哪個？",
        ),
      ]}
      next={[
        {
          href: "/culture/peoples",
          label: t("Meet the sixteen peoples", "認識十六個族群"),
        },
        { href: "/culture", label: t("Open the village map", "開啟部落地圖") },
        {
          href: "/teach/villages-and-places",
          label: t("Lesson: Villages and places", "課程：部落與地名"),
        },
      ]}
      sourcesIntro={t(
        "Year-end counts and shares are as printed in these publications, and the 2025 breakdowns are from the ministry’s bulletin. The few figures worked out here from those numbers are the percentage rise, the combined share of the three largest peoples, and the “everyone else” bar.",
        "年底人數與占比均照下列出版品所列；2025 年的各項分類來自內政部通報。本頁依這些數字自行算出的只有少數幾項：增加百分比、三大族合計占比，以及「其餘所有人」。",
      )}
      sources={localiseSources(populationSources, language)}
    >
      <TimePanel
        id="po-people"
        title={t(
          "Registered Indigenous people at three year-ends",
          "三個年底的戶籍登記原住民人口",
        )}
        sub={t("People, end of year", "人數，年底")}
        caption={t(
          "Years between the bars exist at the ministry but are not copied here, so they are left out rather than drawn as a straight line.",
          "各長條之間的年份內政部有資料，但本頁未抄錄，所以留白，而不是畫成一條直線。",
        )}
        table={{
          caption: t("Registered Indigenous people", "戶籍登記原住民人口"),
          head: [
            t("End of year", "年底"),
            t("Indigenous people", "原住民人數"),
            t("Share of nation", "占全國比例"),
            t("Whole population", "全國人口"),
          ],
          rows: yearEnds.map((row) => [
            String(row.year),
            num(row.people),
            `${row.sharePct}%`,
            row.nation === null ? t("not copied", "未抄錄") : num(row.nation),
          ]),
        }}
      >
        <BarChart
          label={t(
            "Registered Indigenous people at year-end",
            "年底戶籍登記原住民人口",
          )}
          empty={t("not given", "未提供")}
          series={[
            { key: "people", label: t("People", "人數"), tone: "accent" },
          ]}
          groups={yearEnds.map((row) => ({
            key: String(row.year),
            label: String(row.year),
            sub: t("end of year", "年底"),
            values: [row.people],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="po-share"
        title={t("Their share of everyone in Taiwan", "占全臺灣人口的比例")}
        sub={t("Percent of the national population", "占全國人口百分比")}
        caption={t(
          "The bars start at zero, so their heights are in true proportion.",
          "長條從零開始，所以高度是真實的比例。",
        )}
      >
        <BarChart
          label={t("Share of the national population", "占全國人口比例")}
          empty={t("not given", "未提供")}
          format={(value) => `${value}%`}
          series={[{ key: "share", label: t("Share", "比例"), tone: "ink" }]}
          groups={yearEnds.map((row) => ({
            key: String(row.year),
            label: String(row.year),
            sub: t("end of year", "年底"),
            values: [row.sharePct],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="po-peoples"
        title={t("Who the 2025 total is made of", "2025 年的總數由誰組成")}
        sub={t(
          "The three largest of the 16 legally recognised peoples, end of 2025",
          "法定 16 族中最大的三族，2025 年底",
        )}
        caption={t(
          "“Everyone else” is computed here as the total minus the three bars beside it.",
          "「其餘所有人」是本頁以總數減去旁邊三根長條所得。",
        )}
        table={{
          caption: t(
            "Registered Indigenous people by people, end of 2025",
            "2025 年底各族登記人數",
          ),
          head: [
            t("People", "族群"),
            t("Registered people", "登記人數"),
            t("Share of total", "占總數"),
            t("Source", "來源"),
          ],
          rows: [
            ...peopleRows.map((row) => [
              row.label,
              num(row.people),
              pct1(row.sharePct),
              row.key === "rest"
                ? t("computed", "計算所得")
                : t("MOI bulletin", "內政部通報"),
            ]),
            [
              t("Total", "合計"),
              num(last.people),
              "100%",
              t("MOI bulletin", "內政部通報"),
            ],
          ],
        }}
      >
        <BarChart
          label={t(
            "Registered Indigenous people by people, end of 2025",
            "2025 年底各族登記人數",
          )}
          empty={t("not given", "未提供")}
          series={[
            { key: "people", label: t("People", "人數"), tone: "accent" },
          ]}
          groups={peopleRows.map((row) => ({
            key: row.key,
            label: row.label,
            sub: pct1(row.sharePct),
            tone: row.key === "rest" ? "soft" : undefined,
            values: [row.people],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="po-places"
        title={t("Where they are registered", "戶籍登記在哪裡")}
        sub={t(
          "Three counties with the most registered Indigenous people, end of 2025",
          "登記原住民人數最多的三個縣市，2025 年底",
        )}
        caption={t(
          "These are counts. The share of each county’s own residents is in the table, and it ranks the counties differently.",
          "這些是人數。各縣市自己居民中的占比在表格裡，排序與人數不同。",
        )}
        table={{
          caption: t(
            "Registered Indigenous people by county, end of 2025",
            "2025 年底各縣市登記人數",
          ),
          head: [
            t("County", "縣市"),
            t("Registered people", "登記人數"),
            t("Share of all registered Indigenous people", "占全國原住民人數"),
            t("Share of the county’s own residents", "占該縣市居民"),
          ],
          rows: places2025.map((row) => {
            const own = ownShares.find((entry) => entry.key === row.key);
            return [
              language === "en" ? row.en : row.zh,
              num(row.people),
              pct1(row.sharePct),
              own
                ? pct1(own.sharePct)
                : t("not among the top three", "不在前三名"),
            ];
          }),
        }}
      >
        <BarChart
          label={t(
            "Registered Indigenous people by county, end of 2025",
            "2025 年底各縣市登記原住民人數",
          )}
          empty={t("not given", "未提供")}
          series={[
            { key: "people", label: t("People", "人數"), tone: "accent" },
          ]}
          groups={places2025.map((row) => ({
            key: row.key,
            label: language === "en" ? row.en : row.zh,
            sub: t(
              `${pct1(row.sharePct)} of all`,
              `占全國 ${pct1(row.sharePct)}`,
            ),
            values: [row.people],
          }))}
        />
      </TimePanel>
    </TimePage>
  );
}
