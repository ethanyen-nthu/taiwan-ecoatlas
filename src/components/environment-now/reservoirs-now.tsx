"use client";
import { useMemo } from "react";
import {
  exceedsCapacity,
  regionNames,
  regionOrder,
  reservoirLabel,
  summariseReservoirs,
  type ReservoirReading,
} from "@/lib/reservoirs";
import { sourceById } from "@/lib/sources";
import { useLanguage } from "../providers";
import { Status, useFormatTime } from "../status";
import { TimePage, TimePanel } from "../trends/time-page";
import { HBars } from "./h-bars";
import { useReservoirs } from "./use-reservoirs";
import "./environment-now.css";

const mcm = (value: number) =>
  value.toLocaleString("en", {
    minimumFractionDigits: value >= 10 ? 1 : 2,
    maximumFractionDigits: value >= 10 ? 1 : 2,
  });
const pct = (value: number) => `${value.toFixed(1)}%`;

export function ReservoirsNow() {
  const { language, t } = useLanguage();
  const formatTime = useFormatTime();
  const { data, loading, refresh } = useReservoirs();
  const readings = useMemo(() => data?.readings ?? [], [data]);
  const summary = useMemo(() => summariseReservoirs(readings), [readings]);
  const has = readings.length > 0;
  const label = (reading: ReservoirReading) =>
    reservoirLabel(reading, language);
  const unit = t("million m³", "百萬立方公尺");
  const source = sourceById("reservoirs");

  const ordered = useMemo(
    () =>
      [...readings].sort(
        (a, b) =>
          regionOrder.indexOf(a.region ?? "islands") -
            regionOrder.indexOf(b.region ?? "islands") ||
          (b.capacityMcm ?? -1) - (a.capacityMcm ?? -1) ||
          a.id.localeCompare(b.id),
      ),
    [readings],
  );

  const facts =
    has && summary.combinedPercent !== null && summary.lowest
      ? [
          {
            num: pct(summary.combinedPercent),
            what: t(
              `Combined storage of the ${summary.large.length} large reservoirs, as a share of their effective capacity`,
              `${summary.large.length} 座大型水庫的合計蓄水量，占其有效容量的比例`,
            ),
            detail: t(
              `${mcm(summary.combinedStorageMcm)} of ${mcm(summary.combinedCapacityMcm)} ${unit}. Large means 10 ${unit} of capacity or more.`,
              `${mcm(summary.combinedStorageMcm)} ／ ${mcm(summary.combinedCapacityMcm)} ${unit}。大型指有效容量 10 ${unit} 以上。`,
            ),
          },
          {
            num: pct(summary.lowest.percent!),
            what: t(
              `Lowest of the large reservoirs: ${label(summary.lowest)}`,
              `大型水庫中最低：${label(summary.lowest)}`,
            ),
            detail: t(
              `${mcm(summary.lowest.storageMcm!)} of ${mcm(summary.lowest.capacityMcm!)} ${unit}.`,
              `${mcm(summary.lowest.storageMcm!)} ／ ${mcm(summary.lowest.capacityMcm!)} ${unit}。`,
            ),
          },
          {
            num: String(summary.measured),
            what: t(
              "Reservoirs and weirs with both a storage and a capacity figure",
              "同時有蓄水量與有效容量數字的水庫與堰壩",
            ),
            detail: t(
              `Reservoirs with a water level but no percentage: ${summary.levelOnly}.`,
              `只有水位、沒有百分比的水庫：${summary.levelOnly} 處。`,
            ),
          },
        ]
      : [];

  return (
    <TimePage
      section="environment"
      tab="reservoirs"
      live
      crumb={t("Reservoirs now", "水庫現況")}
      title={t(
        "How full are Taiwan’s reservoirs?",
        "臺灣的水庫現在蓄了多少水？",
      )}
      lede={t(
        "The Water Resources Agency publishes each reservoir’s storage and water level. This page works out how full each one is, shows every reading’s time, and says what the feed cannot tell you.",
        "水利署公布各水庫的蓄水量與水位。本頁算出各水庫的蓄水比例，標示每筆讀數的時間，並說明這份資料說不出的事。",
      )}
      facts={facts}
      notes={[
        {
          title: t("The percentage is worked out here", "百分比由本平台計算"),
          body: t(
            "The agency’s storage feed gives the water stored in a reservoir; its daily list gives the reservoir’s effective capacity. This page divides one by the other. It is not a figure the agency prints, and it is not capped: a reservoir can come out above 100% when the two numbers are not from the same moment or when the listed capacity is out of date.",
            "水利署的蓄水資料給出水庫現有的蓄水量，每日營運清單則給出有效容量。本頁把前者除以後者。這不是水利署印出的數字，也沒有設上限：兩個數字不是同一時刻，或列載的容量已過時，都可能讓比例超過 100%。",
          ),
        },
        {
          title: t("Readings have different times", "各筆讀數的時間不同"),
          body: t(
            "Some reservoirs report automatically every hour, others are read by hand once a day. The table gives each reservoir’s own reading time, so a morning reading beside an afternoon one is not a mistake.",
            "有些水庫每小時自動回報，有些則每天人工觀測一次。表中列出各水庫自己的讀數時間，所以早上的讀數與下午的並列並不是錯誤。",
          ),
        },
        {
          title: t(
            "Not the agency’s water-supply signal",
            "不是水利署的供水燈號",
          ),
          body: t(
            "The agency asks that storage percentages not be coloured green, yellow, orange or red, so they are not mistaken for its water-situation lights. These bars use one colour for that reason. Whether a region’s water supply is in trouble depends on more than one day’s storage.",
            "水利署請使用者不要把蓄水率用綠、黃、橙、紅著色，以免與水情燈號混淆。這些長條因此只用一種顏色。某地區供水是否吃緊，不能只看單日蓄水量。",
          ),
        },
        {
          title: t("This is now, not history", "這是現況，不是歷史"),
          body: t(
            "The feed this page reads holds only about the latest day of readings, so it cannot show whether a reservoir is higher or lower than last month or last year. That comparison needs the agency’s own statistics, which this atlas does not yet hold, and nothing is estimated to fill the gap.",
            "本頁讀取的資料只有大約最近一天的讀數，因此無法顯示某水庫比上個月或去年高或低。要比較需要水利署自己的統計，本平台目前尚未收錄，也不會以估算填補。",
          ),
        },
        {
          title: t("Weirs and ponds are in the list", "清單中也有堰與蓄水池"),
          body: t(
            "The agency’s list includes weirs, ponds and a few reservoirs it gives no name or capacity for. Those appear in the table with dashes where a figure is missing. The bar chart shows only the large reservoirs.",
            "水利署的清單也包含堰、蓄水池，以及少數沒有名稱或容量的水庫。這些在表中以破折號標出缺漏的數字；長條圖只呈現大型水庫。",
          ),
        },
      ]}
      questions={[
        t(
          "A reservoir that is nearly full today says little about next month. Which other data (rainfall, demand, earlier years) would you want before calling a region safe or at risk?",
          "今天幾乎全滿的水庫，說不出下個月的狀況。在判斷某地區安全或吃緊之前，你還想要哪些資料（降雨、用水需求、往年同期）？",
        ),
        t(
          "Some reservoirs can come out above 100% when storage and capacity come from two different datasets. Give two reasons that could happen, and a way to check each.",
          "當蓄水量與容量來自兩個不同資料集時，有些水庫的比例可能超過 100%。請說出兩個可能原因，以及各自的檢查方法。",
        ),
        t(
          "The agency asks that storage not be coloured like its water-situation lights. What could go wrong if a map coloured reservoirs green, yellow and red by percentage full?",
          "水利署請使用者不要把蓄水量用水情燈號的顏色著色。如果地圖依蓄水比例把水庫塗成綠、黃、紅，可能出什麼問題？",
        ),
      ]}
      next={[
        {
          href: "/environment/rivers-over-time",
          label: t("Rivers over time", "河川的變化"),
        },
        {
          href: "/environment/weather",
          label: t("Weather now", "此刻的天氣"),
        },
      ]}
      sourcesIntro={t(
        "Both datasets come from the Water Resources Agency, Ministry of Economic Affairs, under the Open Government Data License, version 1.0. Capacity and storage are in 10,000 m³ in the source and are shown here in million m³.",
        "兩份資料皆來自經濟部水利署，採政府資料開放授權條款第 1 版。來源的蓄水量與容量單位為萬立方公尺，本頁換算為百萬立方公尺顯示。",
      )}
      sources={[
        {
          id: "wra-status",
          title: t("Reservoir water situation", "水庫水情資料"),
          publisher: t("Water Resources Agency", "經濟部水利署"),
          url: "https://data.gov.tw/dataset/45501",
          used: t(
            "storage, water level, catchment rain",
            "蓄水量、水位、集水區降雨",
          ),
        },
        {
          id: "wra-daily",
          title: t("Reservoir daily operation status", "水庫每日營運狀況"),
          publisher: t("Water Resources Agency", "經濟部水利署"),
          url: "https://data.gov.tw/dataset/41568",
          used: t(
            "names, effective capacity, full water level",
            "名稱、有效容量、滿水位",
          ),
        },
      ]}
    >
      <div className="now-bar" data-now-bar>
        <Status status={data?.status} loading={loading && !data} />
        <p>
          {data?.lastObservationAt
            ? t(
                `Newest reading ${formatTime(data.lastObservationAt)} (Taiwan time). Checked ${formatTime(data.checkedAt)}.`,
                `最新讀數 ${formatTime(data.lastObservationAt)}（臺灣時間）。查詢時間 ${formatTime(data.checkedAt)}。`,
              )
            : loading
              ? t("Fetching the latest readings…", "正在取得最新讀數…")
              : t("No readings yet.", "尚無讀數。")}
        </p>
        <button type="button" onClick={refresh}>
          {t("Refresh", "重新整理")}
        </button>
      </div>

      {!has && !loading && (
        <div className="now-empty" role="status">
          <p>
            {t(
              "The Water Resources Agency feed is not answering right now, so there is nothing to show. Nothing is estimated in its place.",
              "水利署的資料目前沒有回應，因此沒有可顯示的內容，也不會以估算取代。",
            )}
          </p>
          <p>
            {t(
              "Try Refresh in a minute. The source is listed below.",
              "請稍候一分鐘後再按「重新整理」。來源列於下方。",
            )}
          </p>
        </div>
      )}

      {has && (
        <>
          <TimePanel
            id="res-large"
            title={t(
              "How full each large reservoir is",
              "各大型水庫的蓄水比例",
            )}
            sub={t(
              `Storage as a share of effective capacity. The ${summary.large.length} largest reservoirs, biggest first.`,
              `蓄水量占有效容量的比例。${summary.large.length} 座大型水庫，由大至小。`,
            )}
            caption={t(
              "A full bar is 100% of effective capacity. A hatched bar passes 100%: the two figures come from different datasets.",
              "滿格代表有效容量的 100%。斜線長條表示超過 100%：兩個數字來自不同的資料集。",
            )}
          >
            <HBars
              label={t("Percentage full, large reservoirs", "大型水庫蓄水比例")}
              max={100}
              empty={t("Not reported", "未回報")}
              rows={summary.large.map((r) => ({
                key: r.id,
                label: label(r),
                sub: t(
                  `capacity ${mcm(r.capacityMcm!)} ${unit}`,
                  `容量 ${mcm(r.capacityMcm!)} ${unit}`,
                ),
                value: r.percent,
                text: pct(r.percent!),
                flag: exceedsCapacity(r.percent!)
                  ? t("above 100%", "超過 100%")
                  : undefined,
              }))}
            />
            <p className="hb-scale" aria-hidden="true">
              <span>0%</span>
              <span>100%</span>
            </p>
          </TimePanel>

          <section className="tp-panel" aria-labelledby="res-all">
            <div className="tp-panel-head">
              <h2 id="res-all">
                {t("Every reservoir in the feed", "清單中的每一座水庫")}
              </h2>
              <p>
                {t(
                  `${summary.total} reservoirs, weirs and ponds, by region and then by size. A dash is a figure the agency does not give.`,
                  `${summary.total} 處水庫、堰與蓄水池，依地區再依大小排列。破折號表示水利署沒有提供該數字。`,
                )}
              </p>
            </div>
            <div
              className="now-table-wrap"
              role="region"
              tabIndex={0}
              aria-label={t("All reservoir readings", "所有水庫讀數")}
            >
              <table className="now-table">
                <caption className="tp-sr">
                  {t("Reservoir readings", "水庫讀數")}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Reservoir", "水庫")}</th>
                    <th scope="col">{t("Region", "地區")}</th>
                    <th scope="col">
                      {t(`Stored (${unit})`, `蓄水量（${unit}）`)}
                    </th>
                    <th scope="col">
                      {t(`Capacity (${unit})`, `有效容量（${unit}）`)}
                    </th>
                    <th scope="col">{t("Full", "蓄水比例")}</th>
                    <th scope="col">{t("Water level (m)", "水位（公尺）")}</th>
                    <th scope="col">
                      {t("Below full level (m)", "低於滿水位（公尺）")}
                    </th>
                    <th scope="col">
                      {t("Catchment rain (mm)", "集水區雨量（毫米）")}
                    </th>
                    <th scope="col">{t("Reading time", "讀數時間")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">
                        {label(r)}
                        <small
                          data-csv-extra={t("Reservoir no.", "水庫編號")}
                          data-csv={r.id}
                        >
                          {t("No.", "編號")} {r.id}
                        </small>
                      </th>
                      <td>
                        {r.region ? regionNames[r.region][language] : "—"}
                      </td>
                      <Cell value={r.storageMcm} format={mcm} />
                      <Cell value={r.capacityMcm} format={mcm} />
                      <Cell value={r.percent} format={pct} />
                      <Cell value={r.levelM} format={(v) => v.toFixed(2)} />
                      <Cell value={r.belowFullM} format={(v) => v.toFixed(2)} />
                      <Cell
                        value={r.catchmentRainMm}
                        format={(v) => v.toFixed(1)}
                      />
                      <td>{formatTime(r.observedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tp-caption">
              {t(
                `Data: ${source.agency.en}, retrieved ${data?.retrievedAt ? formatTime(data.retrievedAt) : "—"}. “Below full level” is the full water level minus today’s level; a negative number means the water is above the listed full level.`,
                `資料：${source.agency.zh}，擷取時間 ${data?.retrievedAt ? formatTime(data.retrievedAt) : "—"}。「低於滿水位」為滿水位減去目前水位；負數代表水位高於列載的滿水位。`,
              )}
            </p>
          </section>
        </>
      )}
    </TimePage>
  );
}

function Cell({
  value,
  format,
}: {
  value: number | null;
  format: (value: number) => string;
}) {
  const { t } = useLanguage();
  return value === null ? (
    <td data-empty="true">
      <span aria-hidden="true">—</span>
      <span className="tp-sr">{t("Not given", "未提供")}</span>
    </td>
  ) : (
    <td>{format(value)}</td>
  );
}
