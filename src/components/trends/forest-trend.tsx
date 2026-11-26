"use client";
import {
  atlas2023,
  forestSources,
  fourthTypesPct,
  globalAverageCoverPct,
  inventories,
  perPerson,
  plantationChangeHa,
  sharePct,
  thirdIslandHa,
  thirdTypesHa,
} from "@/content/forest-history";
import { localiseSources } from "@/content/history-types";
import { useLanguage } from "../providers";
import { BarChart } from "./bar-chart";
import { TimePage, TimePanel } from "./time-page";

const ha = (value: number) => value.toLocaleString("en-US");
const pct = (value: number) => `${value.toFixed(2)}%`;
const pct0 = (value: number) => `${Math.round(value)}%`;

export function ForestTrend() {
  const { language, t } = useLanguage();
  const [third, fourth] = inventories;
  const thirdTotal = Object.values(thirdTypesHa).reduce((a, b) => a + b, 0);
  const types = [
    {
      key: "broadleaf",
      label: t("Broadleaf forest", "闊葉樹林"),
      third: sharePct(thirdTypesHa.broadleaf, thirdTotal),
      fourth: fourthTypesPct.broadleaf,
      thirdHa: thirdTypesHa.broadleaf,
    },
    {
      key: "conifer",
      label: t("Conifer forest", "針葉樹林"),
      third: sharePct(thirdTypesHa.conifer, thirdTotal),
      fourth: fourthTypesPct.conifer,
      thirdHa: thirdTypesHa.conifer,
    },
    {
      key: "mixed",
      label: t("Mixed forest", "針闊葉混淆林"),
      third: sharePct(thirdTypesHa.mixed, thirdTotal),
      fourth: fourthTypesPct.mixed,
      thirdHa: thirdTypesHa.mixed,
    },
    {
      key: "other",
      label: t(
        "Bamboo (3rd) / other (4th)",
        "竹林（第 3 次）／其他（第 4 次）",
      ),
      third: sharePct(thirdTypesHa.bamboo, thirdTotal),
      fourth: fourthTypesPct.other,
      thirdHa: thirdTypesHa.bamboo,
    },
  ];
  const atlasPct = sharePct(atlas2023.forestKm2, atlas2023.mappedKm2);
  const perPersonDrop = Math.round(
    ((perPerson.first.ha - perPerson.fourth.ha) / perPerson.first.ha) * 100,
  );

  return (
    <TimePage
      section="forests"
      tab="cover"
      crumb={t("Forest over time", "森林的變化")}
      title={t("Has Taiwan’s forest grown?", "臺灣的森林有變多嗎？")}
      lede={t(
        "Two national forest inventories, twenty years apart, say forest cover rose a little, while forest per person fell by half. Here is what they measured, and why the atlas’s own 2023 map is not a third point on the line.",
        "相隔二十年的兩次全國森林資源調查顯示，森林覆蓋率小幅上升，但每人擁有的森林面積減少了一半。以下說明它們量了什麼，以及為什麼本平台的 2023 年地圖不是這條線上的第三個點。",
      )}
      facts={[
        {
          num: `${third.coverPct}% → ${fourth.coverPct}%`,
          what: t(
            `Forest cover of Taiwan’s land, 3rd inventory (${third.completed}) to 4th (${fourth.completed})`,
            `臺灣土地的森林覆蓋率，第 3 次調查（${third.completed}）至第 4 次（${fourth.completed}）`,
          ),
          detail: t(
            `The Forestry Bureau notes this is about twice the global average of ${globalAverageCoverPct}%`,
            `林務局指出這約為全球平均 ${globalAverageCoverPct}% 的兩倍`,
          ),
        },
        {
          num: `${perPerson.first.ha} → ${perPerson.fourth.ha} ha`,
          what: t(
            `Forest per person, ${perPerson.first.year} to the 4th inventory`,
            `每人擁有的森林面積，${perPerson.first.year} 年至第 4 次調查`,
          ),
          detail: t(
            `Down ${perPersonDrop}% as the population grew about 2.5 times`,
            `減少 ${perPersonDrop}%，因為人口增加約 2.5 倍`,
          ),
        },
        {
          num: `−${ha(Math.abs(plantationChangeHa))} ha`,
          what: t(
            "Plantation forest, 3rd to 4th inventory",
            "人工林面積，第 3 次至第 4 次調查",
          ),
          detail: t(
            "Partly because ageing plantations are being taken over by secondary forest",
            "部分原因是老化的人工林被次生林木取代",
          ),
        },
      ]}
      notes={[
        {
          title: t("Two points, twenty years apart", "兩個點，相隔二十年"),
          body: t(
            `The 3rd inventory was completed in ${third.completed} and the 4th in ${fourth.completed}; this page shows only those two, so it is a comparison, not a trend line. The 4th figure also counts Kinmen and Lienchiang, while the 3rd divides by the area of the island of Taiwan (${ha(thirdIslandHa)} ha), so compare the percentages, not the hectares.`,
            `第 3 次調查於 ${third.completed} 年完成，第 4 次於 ${fourth.completed} 年完成；本頁只呈現這兩次，所以是比較，不是趨勢線。第 4 次數字還包含金門與連江，第 3 次則以臺灣全島面積（${ha(thirdIslandHa)} 公頃）為分母，所以請比較百分比，而不是公頃數。`,
          ),
        },
        {
          title: t(
            "More forest cover, less forest per person",
            "森林覆蓋較多，每人森林較少",
          ),
          body: t(
            `Cover rose by ${(fourth.coverPct - third.coverPct).toFixed(2)} percentage points, yet each person now has ${perPersonDrop}% less forest than in ${perPerson.first.year}. Both statements are true; they answer different questions, one about the land and one about people.`,
            `覆蓋率上升了 ${(fourth.coverPct - third.coverPct).toFixed(2)} 個百分點，但每個人擁有的森林比 ${perPerson.first.year} 年少了 ${perPersonDrop}%。兩句話都對，它們回答的是不同的問題：一個關於土地，一個關於人。`,
          ),
        },
        {
          title: t(
            "Why the atlas’s 2023 map is not a third point",
            "為什麼本平台的 2023 年地圖不是第三個點",
          ),
          body: t(
            `The atlas’s own map reads ${atlasPct.toFixed(1)}% forest. It is a research classification from satellite images, expressed as a share of the area it mapped in ${atlas2023.countiesMapped} counties, with an unresolved class left in. Setting ${atlasPct.toFixed(1)}% beside ${fourth.coverPct}% would suggest forest shrank; the two methods differ too much to say that.`,
            `本平台地圖顯示森林占 ${atlasPct.toFixed(1)}%。那是以衛星影像做的研究分類，算的是它在 ${atlas2023.countiesMapped} 個縣市所繪製面積的比例，且保留了一個未區分類別。把 ${atlasPct.toFixed(1)}% 放在 ${fourth.coverPct}% 旁邊，會讓人以為森林縮小了；兩種方法差異太大，無法這樣下結論。`,
          ),
        },
        {
          title: t(
            "Fewer plantations is not the same as less forest",
            "人工林減少不等於森林減少",
          ),
          body: t(
            "The Bureau reports plantation forest 66,000 ha smaller than in the 3rd inventory, and says some plantations are degrading as secondary forest grows in. Land can leave one forest category and enter another without ceasing to be forest.",
            "林務局指出，人工林較第 3 次調查減少 6.6 萬公頃，部分人工林正逐漸退化、次生林木入侵。土地可以離開一個森林類別、進入另一個，而不必不再是森林。",
          ),
        },
        {
          title: t(
            "Forest types are not defined identically",
            "林型的界定並不完全相同",
          ),
          body: t(
            "The 3rd inventory reports bamboo forest as its own class; the 4th reports an ‘other’ group of 11%. Surveys twenty years apart can draw category lines differently, so read the type shares as a direction (more broadleaf, less conifer), not as exact change.",
            "第 3 次調查把竹林列為獨立類別，第 4 次則列出 11% 的「其他」。相隔二十年的調查，類別界線可能畫得不同，所以請把林型占比當成方向（闊葉較多、針葉較少），而不是精確的變化。",
          ),
        },
      ]}
      questions={[
        t(
          "Forest cover rose while forest per person fell by more than half. Which number would a city planner care about, and which would an ecologist?",
          "森林覆蓋率上升，每人森林面積卻減少超過一半。城市規劃者會在意哪個數字？生態學者呢？",
        ),
        t(
          `The atlas’s 2023 map says ${atlasPct.toFixed(1)}% and the 4th inventory says ${fourth.coverPct}%. List the reasons these two numbers cannot simply be subtracted.`,
          `本平台 2023 年地圖是 ${atlasPct.toFixed(1)}%，第 4 次調查是 ${fourth.coverPct}%。請列出這兩個數字不能直接相減的理由。`,
        ),
        t(
          "Plantations shrank while forest cover grew. Is that good news for wildlife, for timber, or for both?",
          "人工林減少，森林覆蓋率卻增加。這對野生動物、對木材，還是兩者，是好消息？",
        ),
      ]}
      next={[
        {
          href: "/forests",
          label: t("Open the land-cover map", "開啟土地覆蓋地圖"),
        },
        {
          href: "/teach/where-is-the-forest",
          label: t("Lesson: Where is the forest?", "課程：森林在哪裡？"),
        },
      ]}
      sourcesIntro={t(
        "The inventory figures were copied by hand from the Forestry Bureau documents below. The 2023 figure is computed by the atlas from its own county statistics. Please check against the originals before citing.",
        "調查數字是從下列林務局文件人工抄錄；2023 年的數字由本平台以自己的縣市統計計算。引用前請對照原文。",
      )}
      sources={localiseSources(forestSources, language)}
    >
      <TimePanel
        id="fo-cover"
        title={t(
          "Forest cover in two inventories, and one map that is not a third",
          "兩次調查的森林覆蓋率，以及一張不能當第三點的地圖",
        )}
        sub={t(
          "Percent of land area, axis from 0 to 100",
          "占土地面積百分比，座標軸 0 至 100",
        )}
        caption={t(
          "The hatched bar is the atlas’s own 2023 map: a different method and a different denominator, drawn apart on purpose.",
          "斜線長條是本平台自己的 2023 年地圖：方法與分母都不同，刻意分開呈現。",
        )}
        table={{
          caption: t("Forest cover", "森林覆蓋率"),
          head: [
            t("Measure", "項目"),
            t("Forest cover", "森林覆蓋率"),
            t("Forest area", "森林面積"),
            t("Scope", "範圍"),
          ],
          rows: [
            [
              t(
                `3rd inventory (${third.completed})`,
                `第 3 次調查（${third.completed}）`,
              ),
              pct(third.coverPct),
              `${ha(third.forestHa)} ha`,
              t(
                `Island of Taiwan, ${ha(thirdIslandHa)} ha`,
                `臺灣全島，${ha(thirdIslandHa)} 公頃`,
              ),
            ],
            [
              t(
                `4th inventory (${fourth.completed})`,
                `第 4 次調查（${fourth.completed}）`,
              ),
              pct(fourth.coverPct),
              t(
                `about ${ha(fourth.forestHa)} ha`,
                `約 ${ha(fourth.forestHa)} 公頃`,
              ),
              t("Including Kinmen and Lienchiang", "含金門、連江"),
            ],
            [
              t("Atlas 2023 map", "本平台 2023 年地圖"),
              pct(atlasPct),
              t(
                `${ha(Math.round(atlas2023.forestKm2 * 100))} ha of ${ha(Math.round(atlas2023.mappedKm2 * 100))} ha mapped`,
                `已繪製 ${ha(Math.round(atlas2023.mappedKm2 * 100))} 公頃中的 ${ha(Math.round(atlas2023.forestKm2 * 100))} 公頃`,
              ),
              t(
                `${atlas2023.countiesMapped} counties; not comparable`,
                `${atlas2023.countiesMapped} 個縣市；不可比較`,
              ),
            ],
          ],
        }}
      >
        <BarChart
          label={t(
            "Forest cover as a share of land area",
            "森林覆蓋率占土地面積比例",
          )}
          empty={t("not given", "未提供")}
          format={pct}
          max={100}
          legend={[
            {
              tone: "accent",
              label: t("Forestry Bureau inventory", "林務局森林資源調查"),
            },
            {
              tone: "hatched",
              label: t(
                "Atlas 2023 map (different method)",
                "本平台 2023 年地圖（方法不同）",
              ),
            },
          ]}
          series={[
            {
              key: "cover",
              label: t("Forest cover", "森林覆蓋率"),
              tone: "accent",
            },
          ]}
          groups={[
            {
              key: "third",
              label: t("3rd inventory", "第 3 次調查"),
              sub: t(
                `completed ${third.completed}`,
                `${third.completed} 年完成`,
              ),
              values: [third.coverPct],
            },
            {
              key: "fourth",
              label: t("4th inventory", "第 4 次調查"),
              sub: t(
                `completed ${fourth.completed}`,
                `${fourth.completed} 年完成`,
              ),
              values: [fourth.coverPct],
            },
            {
              key: "atlas",
              label: t("Atlas 2023 map", "本平台 2023 年地圖"),
              sub: t("not comparable", "不可比較"),
              tone: "hatched",
              values: [Number(atlasPct.toFixed(2))],
            },
          ]}
        />
      </TimePanel>

      <TimePanel
        id="fo-types"
        title={t("What kind of forest", "是哪一種森林")}
        sub={t(
          "Share of forest area by type, percent",
          "各林型占森林面積比例，百分比",
        )}
        caption={t(
          "Bamboo forest (3rd) and the ‘other’ group (4th) are not the same category. 3rd-inventory shares are computed from its published hectares.",
          "竹林（第 3 次）與「其他」（第 4 次）並非同一類別。第 3 次的比例是由其公布的公頃數計算而得。",
        )}
        table={{
          caption: t("Forest types", "林型"),
          head: [
            t("Type", "林型"),
            t("3rd inventory (ha)", "第 3 次（公頃）"),
            t("3rd inventory (%)", "第 3 次（%）"),
            t("4th inventory (%)", "第 4 次（%）"),
          ],
          rows: types.map((row) => [
            row.label,
            ha(row.thirdHa),
            pct0(row.third),
            pct0(row.fourth),
          ]),
        }}
      >
        <BarChart
          label={t(
            "Share of forest area by forest type",
            "各林型占森林面積比例",
          )}
          empty={t("not given", "未提供")}
          format={pct0}
          max={100}
          series={[
            {
              key: "third",
              label: t(
                `3rd inventory (${third.completed})`,
                `第 3 次調查（${third.completed}）`,
              ),
              tone: "soft",
            },
            {
              key: "fourth",
              label: t(
                `4th inventory (${fourth.completed})`,
                `第 4 次調查（${fourth.completed}）`,
              ),
              tone: "accent",
            },
          ]}
          groups={types.map((row) => ({
            key: row.key,
            label: row.label,
            values: [row.third, row.fourth],
          }))}
        />
      </TimePanel>
    </TimePage>
  );
}
