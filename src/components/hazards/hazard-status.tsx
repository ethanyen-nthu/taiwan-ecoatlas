"use client";
import { ArrowUpRight } from "lucide-react";
import {
  ageWords,
  byStrength,
  countyName,
  cycloneClass,
  cycloneClassLabels,
  cycloneName,
  earthquakeLine,
  intensityBandLabels,
  intensityColours,
  intensityText,
  typhoonLine,
  type HazardFeedState,
  type HazardsResponse,
  type IntensityBand,
} from "@/lib/hazards";
import type { HazardTarget } from "../map/hazard-layers";
import { sourceById } from "@/lib/sources";
import { useLanguage } from "../providers";
import { Status, useFormatTime } from "../status";
import { useNow, type HazardsHook } from "./use-hazards";
import "./hazards.css";

export type HazardKind = "earthquakes" | "typhoon";

/** Under a layer's switch: the feed's freshness, then one plain sentence about
 *  what it holds right now. */
export function HazardRowStatus({
  kind,
  hazards,
  listed,
  onPick,
}: {
  kind: HazardKind;
  hazards: HazardsHook;
  /** The layer is switched on, so its reports are offered as a list. */
  listed: boolean;
  onPick: (target: HazardTarget) => void;
}) {
  const { language } = useLanguage();
  const now = useNow();
  const data = hazards.data;
  const section = kind === "earthquakes" ? data?.earthquakes : data?.typhoon;
  const line = hazards.error
    ? language === "en"
      ? "This site could not reach its own data service, so nothing is drawn."
      : "本站無法連到自己的資料服務，因此圖上沒有資料。"
    : kind === "earthquakes"
      ? earthquakeLine(data?.earthquakes, now, language)
      : typhoonLine(data?.typhoon, now, language);
  return (
    <>
      <Status
        loading={hazards.loading}
        status={hazards.error ? "unavailable" : section?.status}
      />
      {line && (
        <p className="layer-live" data-hazard={kind}>
          {line}
        </p>
      )}
      {listed && data && <HazardList kind={kind} data={data} onPick={onPick} />}
    </>
  );
}

/** The reports as plain buttons. The map is a picture, so this is the way to
 *  reach each report by keyboard or screen reader; it opens the same popup. */
function HazardList({
  kind,
  data,
  onPick,
}: {
  kind: HazardKind;
  data: HazardsResponse;
  onPick: (target: HazardTarget) => void;
}) {
  const { language, t } = useLanguage();
  const now = useNow();
  const items =
    kind === "earthquakes"
      ? data.earthquakes.events.map((event) => ({
          key: event.id,
          target: { kind: "quake", id: event.id } as HazardTarget,
          label: [
            event.magnitude !== null
              ? `M${event.magnitude.toFixed(1)}`
              : t("Magnitude not reported", "未提供規模"),
            event.areas[0]
              ? `${countyName(event.areas[0].county, language)} ${intensityText(event.areas[0].intensity, language)}`
              : null,
            ageWords(event.originTime, now, language),
          ]
            .filter(Boolean)
            .join(" · "),
        }))
      : byStrength(data.typhoon.cyclones).map((cyclone) => {
          const klass = cycloneClass(cyclone.current?.maxWindMs ?? null);
          return {
            key: cyclone.id,
            target: { kind: "cyclone", id: cyclone.id } as HazardTarget,
            label: [
              cycloneName(cyclone, language),
              klass ? cycloneClassLabels[klass][language] : null,
            ]
              .filter(Boolean)
              .join(" · "),
          };
        });
  if (!items.length) return null;
  return (
    <details className="hazard-list" data-hazard-list={kind}>
      <summary>
        {kind === "earthquakes"
          ? t(
              `List the ${items.length} reports`,
              `以清單查看 ${items.length} 筆報告`,
            )
          : t("Go to its latest position", "前往最新位置")}
      </summary>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <button type="button" onClick={() => onPick(item.target)}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

const feedWords: Record<HazardFeedState, { en: string; zh: string }> = {
  ok: { en: "Read", zh: "已讀取" },
  unreadable: { en: "Reply could not be read", zh: "無法讀取回應" },
  unavailable: { en: "Not answering", zh: "沒有回應" },
  "not-configured": { en: "Not configured", zh: "尚未設定" },
};

/** The two feeds in the "Data details" tab, in the same shape as the
 *  station feeds beside them. */
export function HazardDetails({ hazards }: { hazards: HazardsHook }) {
  const { language, t } = useLanguage();
  const formatTime = useFormatTime();
  const data = hazards.data;
  const rows = [
    {
      kind: "earthquakes" as const,
      section: data?.earthquakes,
      feed:
        data &&
        [data.earthquakes.feeds.significant, data.earthquakes.feeds.local]
          .map((state) => feedWords[state][language])
          .join(" · "),
    },
    {
      kind: "typhoon" as const,
      section: data?.typhoon,
      feed: data && feedWords[data.typhoon.feed][language],
    },
  ];
  return (
    <>
      {rows.map(({ kind, section, feed }) => {
        const source = sourceById(kind);
        return (
          <div className="data-detail" key={kind} data-hazard-detail={kind}>
            <h3>{source.name[language]}</h3>
            <Status loading={hazards.loading} status={section?.status} />
            <dl>
              <dt>{t("Dataset", "資料集")}</dt>
              <dd>{source.datasetId}</dd>
              <dt>{t("Feed", "資料來源狀態")}</dt>
              <dd>{feed ?? "—"}</dd>
              <dt>{t("Last successful retrieval", "最後成功擷取")}</dt>
              <dd>{formatTime(section?.retrievedAt)}</dd>
              <dt>{t("Records left out", "略過的紀錄")}</dt>
              <dd>{section ? section.excluded : "—"}</dd>
              <dt>{t("Licence", "授權")}</dt>
              <dd>
                {t(
                  "Open Government Data License 1.0",
                  "政府資料開放授權條款第 1 版",
                )}
              </dd>
            </dl>
            <p className="small muted">{source.note[language]}</p>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.agency[language]}
              <ArrowUpRight size={13} />
            </a>
          </div>
        );
      })}
    </>
  );
}

const bands: IntensityBand[] = ["1-2", "3", "4", "5", "6-7", "unknown"];

/** The map key for whichever of the two layers is switched on. */
export function HazardLegend({
  quakes,
  typhoon,
}: {
  quakes: boolean;
  typhoon: boolean;
}) {
  const { language, t } = useLanguage();
  return (
    <>
      {quakes && (
        <details open data-legend="earthquakes">
          <summary>
            <span
              className="legend-dot"
              style={{ background: intensityColours["5"] }}
            />
            {t("Felt earthquakes", "有感地震")}
          </summary>
          <div className="legend-bands">
            {bands.map((band) => (
              <span key={band}>
                <span
                  className="legend-dot"
                  style={{ background: intensityColours[band] }}
                />
                {intensityBandLabels[band][language]}
              </span>
            ))}
          </div>
          <p>
            {t(
              "Circle size shows magnitude, from a small dot near M2 to the largest near M7. Colour shows the strongest shaking reported.",
              "圓圈大小為規模，從約 M2 的小點到約 M7 的最大圓；顏色為所報告的最大震度。",
            )}
          </p>
        </details>
      )}
      {/* Open when it is the only hazard key; with both on, the key would
          otherwise cover the island it is describing. */}
      {typhoon && (
        <details open={!quakes} data-legend="typhoon">
          <summary>
            <span className="legend-line" />
            {t("Tropical cyclone", "熱帶氣旋")}
          </summary>
          <div>
            <span className="legend-line" />
            {t("Analysed track", "分析路徑")}
          </div>
          <div>
            <span className="legend-line dashed" />
            {t("Forecast track", "預測路徑")}
          </div>
          <div>
            <span className="legend-fix current" />
            {t("Latest analysed position", "最新分析位置")}
          </div>
          <div>
            <span className="legend-fix forecast" />
            {t("Forecast position", "預測位置")}
          </div>
          <div>
            <span className="legend-ring" />
            {t("Winds of 15 m/s or more", "風速 15 m/s 以上範圍")}
          </div>
          <div>
            <span className="legend-ring strong" />
            {t("Winds of 25 m/s or more", "風速 25 m/s 以上範圍")}
          </div>
          <div>
            <span className="legend-ring p70" />
            {t("70% probability circle", "70% 機率圓")}
          </div>
          <p>
            {t(
              "A map of what the agency has published, not a warning.",
              "這是氣象署已發布資料的地圖，不是警報。",
            )}
          </p>
        </details>
      )}
    </>
  );
}
