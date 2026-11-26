"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { SnapshotCounty } from "@/lib/county-snapshot";
import { summariseAir, summariseWeather, inCounty } from "@/lib/live-summary";
import { useLanguage, useObservations } from "./providers";
import { useFormatTime } from "./status";
import "./county-snapshot.css";

const num = (value: number) => value.toLocaleString("en");
const ordinal = (n: number) => {
  const mod = n % 100;
  if (mod >= 11 && mod <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
};

/**
 * The landing page's "your county" section: pick one of the 22 counties and
 * see the current figure for each of the six subjects side by side. Every
 * card says what its number is, ranks it only among counties that have data,
 * and shows a dash (never a zero) where the atlas has nothing for the county.
 */
export function CountySnapshot({ counties }: { counties: SnapshotCounty[] }) {
  const { language, t } = useLanguage();
  const formatTime = useFormatTime();
  const aqi = useObservations("aqi");
  const weather = useObservations("weather");
  const [code, setCode] = useState("63000");
  const county = counties.find((item) => item.code === code) ?? counties[0];
  const name = language === "en" ? county.en : county.zh;
  const sorted = useMemo(() => {
    const collator = new Intl.Collator(language === "en" ? "en" : "zh-TW");
    return [...counties].sort((a, b) =>
      collator.compare(
        language === "en" ? a.en : a.zh,
        language === "en" ? b.en : b.zh,
      ),
    );
  }, [counties, language]);
  const air = useMemo(
    () =>
      summariseAir(
        (aqi.data?.observations ?? []).filter((o) => inCounty(o, county.zh)),
      ),
    [aqi.data, county.zh],
  );
  const wx = useMemo(
    () =>
      summariseWeather(
        (weather.data?.observations ?? []).filter((o) =>
          inCounty(o, county.zh),
        ),
      ),
    [weather.data, county.zh],
  );
  const liveLoading =
    (aqi.loading && !aqi.data) || (weather.loading && !weather.data);
  const bandLabel = air.band
    ? language === "en"
      ? (air.bandEnglish ?? air.band)
      : air.band
    : null;
  const temperatureLine =
    wx.medianTemperature !== null && wx.coolest && wx.warmest && wx.stations > 1
      ? t(
          `Air temperature now: middle station ${wx.medianTemperature.toFixed(1)} °C, from ${wx.coolest.value.toFixed(1)} to ${wx.warmest.value.toFixed(1)} °C across ${num(wx.stations)} stations.`,
          `目前氣溫：中間測站 ${wx.medianTemperature.toFixed(1)} °C，${num(wx.stations)} 個測站介於 ${wx.coolest.value.toFixed(1)} 至 ${wx.warmest.value.toFixed(1)} °C。`,
        )
      : null;

  return (
    <section
      className="cs"
      aria-labelledby="cs-title"
      data-county={county.code}
    >
      <div className="cs-head">
        <div>
          <h2 id="cs-title">
            {t("Your county, side by side", "你的縣市，並排來看")}
          </h2>
          <p>
            {t(
              "Pick one of Taiwan’s 22 counties and cities to see the current figure for each subject. A dash means the atlas has no data there, not zero.",
              "選擇臺灣 22 個縣市之一，查看各專題目前的數字。破折號表示本平台在該處沒有資料，而不是零。",
            )}
          </p>
        </div>
        <label className="cs-pick">
          <span>{t("County or city", "縣市")}</span>
          <select
            value={county.code}
            onChange={(event) => setCode(event.target.value)}
          >
            {sorted.map((item) => (
              <option key={item.code} value={item.code}>
                {language === "en" ? item.en : item.zh}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="cs-now" aria-live="polite">
        {t(`Showing ${name}`, `目前顯示：${name}`)}
        {" · "}
        {language === "en" ? county.zh : county.en}
      </p>
      <ul className="cs-grid">
        <li className="cs-card" data-tone="environment">
          <h3>{t("Air and weather now", "此刻的空氣與天氣")}</h3>
          {air.medianAqi !== null ? (
            <>
              <p className="cs-num">{air.medianAqi}</p>
              <p className="cs-label">
                {air.reporting === 1
                  ? t(
                      `air-quality index at its only station (${bandLabel}).`,
                      `空氣品質指標：唯一測站的讀數（${bandLabel}）。`,
                    )
                  : t(
                      `air-quality index at the middle of its ${air.reporting} stations (${bandLabel}).`,
                      `空氣品質指標：${air.reporting} 個測站的中間值（${bandLabel}）。`,
                    )}
              </p>
            </>
          ) : (
            <>
              <p className="cs-num">—</p>
              <p className="cs-label">
                {liveLoading
                  ? t("Checking the live stations…", "正在查詢即時測站…")
                  : t(
                      "No live air-quality readings for this county right now.",
                      "此縣市目前沒有即時空氣品質讀數。",
                    )}
              </p>
            </>
          )}
          {temperatureLine && <p className="cs-extra">{temperatureLine}</p>}
          <p className="cs-note">
            {air.latest
              ? t(
                  `Latest reading ${formatTime(air.latest)}. The middle station is not a county average.`,
                  `最新讀數 ${formatTime(air.latest)}。中間測站並非縣市平均。`,
                )
              : t(
                  "Live data from MOENV and CWA stations.",
                  "來自環境部與氣象署測站的即時資料。",
                )}
          </p>
          <Link
            className="cs-go"
            href={`/environment?county=${county.code}&shade=1`}
          >
            {t("Open the live map", "開啟即時地圖")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </li>

        <li className="cs-card" data-tone="forests">
          <h3>{t("Forest in 2023", "2023 年森林")}</h3>
          {county.forest ? (
            <>
              <p className="cs-num">{county.forest.sharePct.toFixed(1)}%</p>
              <p className="cs-label">
                {t(
                  `of the mapped area is forest (${num(Math.round(county.forest.forestKm2))} km²), ${ordinal(county.forest.rank)} of ${county.forest.of} counties with data.`,
                  `的已繪製面積為森林（${num(Math.round(county.forest.forestKm2))} 平方公里），在有資料的 ${county.forest.of} 個縣市中排第 ${county.forest.rank}。`,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="cs-num">—</p>
              <p className="cs-label">
                {t(
                  "No mapped pixels for this county in the 2023 release.",
                  "2023 年版本中此縣市沒有已繪製像素。",
                )}
              </p>
            </>
          )}
          <p className="cs-note">
            {t(
              "One year only, so no change over time here.",
              "僅單一年度，這裡看不到時間上的變化。",
            )}
          </p>
          <Link
            className="cs-go"
            href={`/forests?county=${county.code}&shade=1`}
          >
            {t("Open the forest map", "開啟森林地圖")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </li>

        <li className="cs-card" data-tone="wildlife">
          <h3>{t("Roadkill records", "路死紀錄")}</h3>
          {county.wildlife.count > 0 ? (
            <>
              <p className="cs-num">{num(county.wildlife.count)}</p>
              <p className="cs-label">
                {t(
                  `records in the 2014–2017 public subset, ${ordinal(county.wildlife.rank)} of ${county.wildlife.of} counties with records.`,
                  `筆 2014–2017 公開子集紀錄，在有紀錄的 ${county.wildlife.of} 個縣市中排第 ${county.wildlife.rank}。`,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="cs-num">—</p>
              <p className="cs-label">
                {t(
                  "No records for this county in the published subset.",
                  "公開子集中此縣市沒有紀錄。",
                )}
              </p>
            </>
          )}
          <p className="cs-note">
            {t(
              "Counts reflect reporting effort, not animal numbers.",
              "計數反映通報投入，並非動物數量。",
            )}
          </p>
          <Link className="cs-go" href={`/wildlife?county=${county.code}`}>
            {t("Open the roadkill map", "開啟路死地圖")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </li>

        <li className="cs-card" data-tone="culture">
          <h3>{t("Listed villages", "列載部落")}</h3>
          {county.villages.count > 0 ? (
            <>
              <p className="cs-num">{num(county.villages.count)}</p>
              <p className="cs-label">
                {t(
                  `Indigenous village reference points, ${ordinal(county.villages.rank)} of ${county.villages.of} counties with listings.`,
                  `個原住民族部落定位點，在有列載的 ${county.villages.of} 個縣市中排第 ${county.villages.rank}。`,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="cs-num">—</p>
              <p className="cs-label">
                {t(
                  "No Indigenous village listings in this county.",
                  "此縣市沒有原住民族部落列載。",
                )}
              </p>
            </>
          )}
          <p className="cs-note">
            {t(
              "Dots are public reference points, not territories.",
              "定位點為公開定位點，並非傳統領域。",
            )}
          </p>
          <Link
            className="cs-go"
            href={`/culture?county=${county.code}&shade=1`}
          >
            {t("Open the village map", "開啟部落地圖")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </li>

        <li className="cs-card" data-tone="urban">
          <h3>{t("Parks and park trees", "公園與公園樹木")}</h3>
          {county.urban ? (
            <>
              <p className="cs-num">{num(county.urban.trees)}</p>
              <p className="cs-label">
                {t(
                  `surveyed park trees across ${num(county.urban.parks)} parks.`,
                  `棵公園樹木調查紀錄，分布於 ${num(county.urban.parks)} 座公園。`,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="cs-num">—</p>
              <p className="cs-label">
                {t(
                  "The urban inventories in this atlas cover Taipei City only.",
                  "本平台的都市清冊僅涵蓋臺北市。",
                )}
              </p>
            </>
          )}
          <p className="cs-note">
            {t(
              "Survey entries, not proof a tree is alive today.",
              "調查登錄，並不證明該樹目前存活。",
            )}
          </p>
          <Link className="cs-go" href="/urban">
            {t("Open the parks map", "開啟公園地圖")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </li>

        <li className="cs-card" data-tone="plants">
          <h3>{t("Kinds of tree", "樹的種類")}</h3>
          {county.plants ? (
            <>
              <p className="cs-num">{num(county.plants.kinds)}</p>
              <p className="cs-label">
                {t(
                  `kinds of tree among ${num(county.plants.trees)} surveyed park and riverside trees.`,
                  `種樹，來自 ${num(county.plants.trees)} 筆公園與河濱樹木調查。`,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="cs-num">—</p>
              <p className="cs-label">
                {t(
                  "The tree guide covers Taipei City only.",
                  "樹木導覽僅涵蓋臺北市。",
                )}
              </p>
            </>
          )}
          <p className="cs-note">
            {t(
              "Names are as the city’s two inventories record them.",
              "名稱依市府兩份清冊的記載。",
            )}
          </p>
          <Link className="cs-go" href="/plants">
            {t("Open the tree guide", "開啟樹木導覽")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </li>
      </ul>
      <p className="cs-links">
        <Link href={`/county/${county.code}`}>
          {t(`Full profile for ${name}`, `${name}完整檔案`)}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/county">
          {t("Compare all 22 counties", "比較全部 22 個縣市")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/environment/weather">
          {t("Weather, county by county", "各縣市的天氣")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/environment/reservoirs">
          {t("Reservoir storage now", "水庫目前蓄水")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
