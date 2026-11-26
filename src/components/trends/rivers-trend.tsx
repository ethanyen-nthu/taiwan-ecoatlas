"use client";
import {
  bodLoad,
  drought2021,
  riverSources,
  severeLength,
  severeStations,
} from "@/content/river-history";
import { localiseSources } from "@/content/history-types";
import { useLanguage } from "../providers";
import { BarChart } from "./bar-chart";
import { TimePage, TimePanel } from "./time-page";

const whole = (value: number) => value.toLocaleString("en-US");

export function RiversTrend() {
  const { language, t } = useLanguage();
  const [stationsThen, , stationsNow] = severeStations;
  const [lengthThen, lengthNow] = severeLength;
  const networkText = (of: number | null) =>
    of === null
      ? t("not given", "未提供")
      : t(`${of} stations`, `${of} 個測站`);

  return (
    <TimePage
      section="environment"
      tab="rivers"
      crumb={t("Rivers over time", "河川的變化")}
      title={t("Are Taiwan’s rivers cleaner?", "臺灣的河川有變乾淨嗎？")}
      lede={t(
        "The Ministry of Environment reports that severely polluted river stations fell from 66 in 2002 to 2 in 2025. Here is the record, how it is counted, and what it leaves out.",
        "環境部指出，嚴重污染的河川測站由 2002 年的 66 站降到 2025 年的 2 站。以下是這段紀錄、計算的方式，以及它沒有說的事。",
      )}
      facts={[
        {
          num: `${stationsThen.count} → ${stationsNow.count}`,
          what: t(
            `Severely polluted river-monitoring stations, ${stationsThen.year} to ${stationsNow.year}`,
            `嚴重污染的河川測站，${stationsThen.year} 至 ${stationsNow.year} 年`,
          ),
          detail: t(
            "7 of 303 stations in 2024, on the way down",
            "2024 年為 303 站中的 7 站，是下降途中的一年",
          ),
        },
        {
          num: `${lengthThen.percent}% → ${lengthNow.percent}%`,
          what: t(
            `Share of river length that is severely polluted, ${lengthThen.year} to ${lengthNow.year}`,
            `嚴重污染的河川長度比例，${lengthThen.year} 至 ${lengthNow.year} 年`,
          ),
          detail: t(
            "The lowest on record, the ministry says",
            "環境部說是歷年最低",
          ),
        },
        {
          num: `${whole(bodLoad.from.tonnesPerDay)} → ${bodLoad.to.tonnesPerDay}`,
          what: t(
            `Tonnes a day of the indicator pollutant BOD reaching rivers, ${bodLoad.from.year} to about ${bodLoad.to.year}`,
            `每日排入河川的指標污染物 BOD 公噸數，${bodLoad.from.year} 年至約 ${bodLoad.to.year} 年`,
          ),
          detail: t(
            "The agency’s figure. BOD measures how much oxygen the pollution would use up",
            "環保署的數字。BOD 是污染物會消耗多少氧氣的量度",
          ),
        },
      ]}
      notes={[
        {
          title: t(
            "Count stations, or measure length?",
            "算測站數，還是量河段長度？",
          ),
          body: t(
            "The ministry reports both. Stations are points on a river, so the count depends on where stations stand and how many there are: the ministry cites 293 stations for 2002 and a network of 303 for 2024. Length share is closer to what a person walking the bank would see. Neither is a share of the other, so the atlas never turns 66, 7 and 2 into percentages.",
            "環境部兩種都公布。測站是河上的點，所以數目取決於測站設在哪裡、有幾個：環境部引用 2002 年為 293 站，2024 年網絡為 303 站。長度比例比較接近沿河走一趟會看到的情形。兩者不能互相換算，所以本平台不把 66、7、2 換成百分比。",
          ),
        },
        {
          title: t(
            "A dry year can undo a good one",
            "一個乾旱年可能抵銷好成果",
          ),
          body: t(
            `In the 2021 drought, flows fell and the severely polluted stretch of the ${drought2021.river} grew from ${drought2021.fromKm} to ${drought2021.toKm} km. The agency said a river with less water dilutes less, and that the long-run fall in pollution load still held. One year is a data point, not a trend.`,
            `2021 年大旱，河川流量減少，北港溪嚴重污染的河段由 ${drought2021.fromKm} 公里增加到 ${drought2021.toKm} 公里。環保署說，水少稀釋能力就差，而污染量長期下降的趨勢仍在。單一年份只是一個資料點，不是趨勢。`,
          ),
        },
        {
          title: t(
            "Severe is only the worst of four",
            "「嚴重」只是四級中最差的一級",
          ),
          body: t(
            "A river’s length is sorted into unpolluted or slightly, lightly, moderately and severely polluted. A fall in the severe class can sit beside a rise in the moderate one: Tainan’s report on 2023 has the Jishui River’s moderately polluted share rising from 27.7% to 54.76%.",
            "河川長度被分成未（稍）受污染、輕度、中度與嚴重污染四級。嚴重污染的減少，可能與中度污染的增加同時出現：臺南市 2023 年的報告指出，急水溪中度污染比例由 27.7% 升到 54.76%。",
          ),
        },
        {
          title: t("Not every measure improved", "不是每個項目都進步"),
          body: t(
            "Ammonia nitrogen has the lowest compliance of the river measures, under 60% for three years running, and the ministry says about 30% of rivers still have less stable water quality, which it blames on quake-loosened soil and heavy rain.",
            "氨氮是河川水質各項目中達成率最低的，已連續 3 年未達 6 成；環境部也說仍有約三成河川水質較不穩定，原因包括地震造成的鬆軟土石與強降雨沖刷。",
          ),
        },
        {
          title: t(
            "A local story can be bigger than the national one",
            "地方的成績可能比全國更亮眼",
          ),
          body: t(
            "New Taipei City reports the severely polluted length of the Tamsui River at 0.5% in 2024, with its sewer connection rate up from 28% in 2011 to over 72%. That is one river and one city: do not subtract it from the national 1.9%.",
            "新北市指出，2024 年淡水河嚴重污染長度為 0.5%，污水接管率由 2011 年的 28% 升到 72% 以上。這是一條河、一個城市的數字，不能拿來和全國的 1.9% 相減。",
          ),
        },
      ]}
      questions={[
        t(
          "The ministry reports both stations and length. Which would you use to tell the public a river is cleaner, and what does each one hide?",
          "環境部同時公布測站數與河段長度。你會用哪一個告訴大眾河川變乾淨了？各自隱藏了什麼？",
        ),
        t(
          "The 2021 drought made some severely polluted stretches longer. How would you separate weather from policy when judging a clean-up programme?",
          "2021 年大旱讓部分嚴重污染河段變長。評估整治成效時，你會如何把天氣和政策分開？",
        ),
        t(
          "Severe pollution fell but moderate pollution rose in Tainan’s Jishui River. Is that river better? What would you want to see before deciding?",
          "臺南急水溪的嚴重污染下降，中度污染卻上升。這條河變好了嗎？下判斷前你還想看什麼？",
        ),
      ]}
      next={[
        {
          href: "/environment",
          label: t("Open the live map", "開啟即時地圖"),
        },
        {
          href: "/teach/river-pollution-index",
          label: t("Lesson: Scoring a river", "課程：替河川打分數"),
        },
      ]}
      sourcesIntro={t(
        "Every number on this page was copied by hand from the documents below; the atlas keeps no archive of river statistics. Please check against the originals before citing. The ministry’s own year-by-year table, split by river, is open data (the last source in this list).",
        "本頁每個數字都是從下列文件人工抄錄；本平台沒有河川統計的存檔。引用前請對照原文。環境部依河川、逐年分列的完整資料是開放資料（見本列表最後一項）。",
      )}
      sources={localiseSources(riverSources, language)}
    >
      <TimePanel
        id="rv-stations"
        title={t("Severely polluted monitoring stations", "嚴重污染的測站數")}
        sub={t(
          "Number of stations, as published · lower is better",
          "測站數，依公布值 · 數值越低越好",
        )}
        caption={t(
          "Only years that appear in a ministry statement could be traced to a source, so the years between are not drawn. The network is not the same size every year.",
          "只有出現在環境部說明中的年份能對到來源，所以中間的年份不繪出。各年的測站網大小並不相同。",
        )}
        table={{
          caption: t(
            "Severely polluted river-monitoring stations",
            "嚴重污染的河川測站數",
          ),
          head: [
            t("Year", "年"),
            t("Severely polluted stations", "嚴重污染測站"),
            t("Network size cited", "引用的測站網大小"),
          ],
          rows: severeStations.map((point) => [
            point.year,
            point.count,
            networkText(point.of),
          ]),
        }}
      >
        <BarChart
          label={t(
            "Severely polluted river-monitoring stations",
            "嚴重污染的河川測站數",
          )}
          empty={t("not given", "未提供")}
          series={[
            {
              key: "stations",
              label: t("Severely polluted stations", "嚴重污染測站"),
              tone: "accent",
            },
          ]}
          groups={severeStations.map((point) => ({
            key: String(point.year),
            label: String(point.year),
            sub:
              point.of === null
                ? t("network size not given", "未提供測站網大小")
                : t(`of ${point.of} stations`, `共 ${point.of} 站`),
            values: [point.count],
          }))}
        />
      </TimePanel>

      <TimePanel
        id="rv-length"
        title={t(
          "Share of river length that is severely polluted",
          "嚴重污染的河川長度比例",
        )}
        sub={t(
          "Percent of river length · lower is better",
          "河川長度百分比 · 數值越低越好",
        )}
        caption={t(
          "Two years are published side by side by the ministry; the 2021 setback and the years between are not in its statement.",
          "環境部並列公布的只有這兩年；2021 年的反覆與中間各年不在其說明中。",
        )}
        table={{
          caption: t(
            "Share of river length severely polluted",
            "嚴重污染的河川長度比例",
          ),
          head: [
            t("Year", "年"),
            t("Severely polluted length", "嚴重污染長度"),
          ],
          rows: severeLength.map((point) => [point.year, `${point.percent}%`]),
        }}
      >
        <BarChart
          label={t(
            "Share of river length that is severely polluted",
            "嚴重污染的河川長度比例",
          )}
          empty={t("not given", "未提供")}
          format={(value) => `${value}%`}
          series={[
            {
              key: "length",
              label: t("Severely polluted length", "嚴重污染長度"),
              tone: "accent",
            },
          ]}
          groups={severeLength.map((point) => ({
            key: String(point.year),
            label: String(point.year),
            values: [point.percent],
          }))}
        />
      </TimePanel>
    </TimePage>
  );
}
