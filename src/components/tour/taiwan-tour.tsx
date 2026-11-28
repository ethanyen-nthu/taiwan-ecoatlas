"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShapeSet } from "@/lib/county-shapes";
import { degrees } from "@/lib/temperature-history";
import {
  villageColor,
  type CountyRef,
  type LegendItem,
  type Tour,
  type TourLayer,
} from "@/lib/tour";
import { Footer } from "../footer";
import { useLanguage } from "../providers";
import "./tour.css";

const ids = [
  "start",
  "air",
  "warm",
  "forest",
  "roadkill",
  "people",
  "taipei",
  "yours",
] as const;
type StopId = (typeof ids)[number];
type FindingId = Exclude<StopId, "start" | "yours">;

/** Which subject's colours a stop wears. */
const tones: Record<StopId, string> = {
  start: "environment",
  air: "environment",
  warm: "environment",
  forest: "forests",
  roadkill: "wildlife",
  people: "culture",
  taipei: "urban",
  yours: "environment",
};
const layerKey: Record<FindingId, keyof Tour> = {
  air: "air",
  warm: "warm",
  forest: "forest",
  roadkill: "roadkill",
  people: "people",
  taipei: "taipei",
};
const isFinding = (id: StopId): id is FindingId =>
  id !== "start" && id !== "yours";

const neutral = "#e4ddcf";
const hatchId = "tour-hatch";
const offshore = ["09020", "10016", "09007"];

export function TaiwanTour({
  shapes,
  counties,
  tour,
  villageDots,
}: {
  shapes: ShapeSet;
  counties: CountyRef[];
  tour: Tour;
  villageDots: string;
}) {
  const { language, t } = useLanguage();
  const zh = language !== "en";
  const [active, setActive] = useState<StopId>("start");
  const [pick, setPick] = useState("");
  const sections = useRef<Partial<Record<StopId, HTMLElement | null>>>({});

  useEffect(() => {
    const nodes = ids
      .map((id) => sections.current[id])
      .filter((node): node is HTMLElement => !!node);
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setActive(entry.target.getAttribute("data-stop") as StopId);
        }
      },
      // A thin band a little below the middle of the screen: the stop that
      // covers it is the one being read.
      { rootMargin: "-55% 0px -40% 0px" },
    );
    for (const node of nodes) watcher.observe(node);
    return () => watcher.disconnect();
  }, []);

  const byCode = useMemo(
    () => new Map(counties.map((county) => [county.code, county])),
    [counties],
  );
  const name = (code: string) => {
    const county = byCode.get(code);
    return county ? (zh ? county.zh : county.en) : code;
  };
  const short = (code: string) =>
    name(code).replace(zh ? /[縣市]$/ : / (County|City)$/, "");
  const list = (codes: string[]) =>
    codes.length < 2
      ? codes.map(name).join("")
      : zh
        ? `${codes.slice(0, -1).map(name).join("、")}和${name(codes[codes.length - 1])}`
        : `${codes.slice(0, -1).map(name).join(", ")} and ${name(codes[codes.length - 1])}`;
  const locale = zh ? "zh-TW" : "en-US";
  const num = (value: number) => value.toLocaleString(locale);
  const one = (value: number) => value.toFixed(1);
  const minus = (value: number) => (value < 0 ? "−" : "");
  const sorted = useMemo(
    () =>
      [...counties].sort((a, b) =>
        zh ? a.zh.localeCompare(b.zh, "zh-TW") : a.en.localeCompare(b.en),
      ),
    [counties, zh],
  );

  const { air, warm, forest, roadkill, people, taipei } = tour;
  const years = `${roadkill.facts.firstYear}–${roadkill.facts.lastYear}`;

  /** The title above the map, which says what the colours mean right now. */
  const nowTitle: Record<StopId, string> = {
    start: t("22 counties and cities", "22 個縣市"),
    air: t(
      `PM2.5, yearly average in ${air.facts.mapYear},\u00a0µg/m³`,
      `PM2.5 年平均，${air.facts.mapYear} 年，µg/m³`,
    ),
    warm: t(
      `Change in yearly temperature, ${warm.facts.late.from}–${warm.facts.late.to} against each county’s own ${warm.facts.early.from}–${warm.facts.early.to},\u00a0°C`,
      `年平均氣溫變化，${warm.facts.late.from}–${warm.facts.late.to} 年對照各縣市自己的 ${warm.facts.early.from}–${warm.facts.early.to} 年，°C`,
    ),
    forest: t(
      `Forest share of mapped land, ${forest.facts.year}`,
      `森林占已繪製土地的比例，${forest.facts.year} 年`,
    ),
    roadkill: t(
      `Screened wildlife reports, ${years}`,
      `經篩選的野生動物通報，${years} 年`,
    ),
    people: t("Indigenous villages", "原住民族部落"),
    taipei: name(taipei.facts.code),
    yours: pick ? name(pick) : t("Choose a county below", "請在下方選一個縣市"),
  };
  const stopName: Record<StopId, string> = {
    start: t("Start", "開始"),
    air: t("Air", "空氣"),
    warm: t("Temperature", "氣溫"),
    forest: t("Forests", "森林"),
    roadkill: t("Wildlife", "野生動物"),
    people: t("Peoples", "族群"),
    taipei: t("Trees", "樹木"),
    yours: t("Your county", "你的縣市"),
  };

  const layer: TourLayer | null = isFinding(active)
    ? tour[layerKey[active]].layer
    : null;
  const fillFor = (code: string) => {
    if (active === "yours") return code === pick ? "var(--ink)" : neutral;
    const fill = layer?.fills[code];
    if (fill === undefined) return neutral;
    return fill === null ? `url(#${hatchId})` : fill;
  };
  const legend: LegendItem[] = layer?.legend ?? [];
  const hasGap = !!layer && Object.values(layer.fills).some((f) => f === null);
  const highlight =
    active === "yours" ? (pick ? [pick] : []) : (layer?.highlight ?? []);

  const table = (
    id: FindingId,
    heading: string,
    format: (value: number) => string,
  ) => {
    const values = tour[layerKey[id]].layer.values;
    const rows = [...counties].sort((a, b) => {
      const x = values[a.code];
      const y = values[b.code];
      if (x === null && y === null) return a.code.localeCompare(b.code);
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x || a.code.localeCompare(b.code);
    });
    return (
      <details className="tour-table">
        <summary>{t("County figures", "各縣市數字")}</summary>
        <table>
          <caption className="tour-sr">{heading}</caption>
          <thead>
            <tr>
              <th scope="col">{t("County", "縣市")}</th>
              <th scope="col">{heading}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((county) => {
              const value = values[county.code];
              return (
                <tr key={county.code}>
                  <th scope="row">{name(county.code)}</th>
                  <td>
                    {value === null ? (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="tour-sr">
                          {t("no data", "沒有資料")}
                        </span>
                      </>
                    ) : (
                      format(value)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    );
  };

  const step = (
    id: StopId,
    heading: string,
    body: React.ReactNode,
    level: 1 | 2 = 2,
  ) => {
    const Heading = level === 1 ? "h1" : "h2";
    return (
      <section
        key={id}
        id={`stop-${id}`}
        ref={(node) => {
          sections.current[id] = node;
        }}
        className="tour-step"
        data-stop={id}
        data-tone={tones[id]}
        aria-labelledby={`tour-h-${id}`}
      >
        <div className="tour-step-inner">
          <Heading id={`tour-h-${id}`}>{heading}</Heading>
          {body}
        </div>
      </section>
    );
  };
  const figure = (value: string, label: string) => (
    <p className="tour-figure">
      <strong>{value}</strong>
      <span>{label}</span>
    </p>
  );
  const limit = (text: string) => (
    <p className="tour-limit">
      <strong>{t("What it cannot tell you.", "它沒辦法告訴你的。")}</strong>{" "}
      {text}
    </p>
  );
  const more = (href: string, label: string) => (
    <Link className="text-link" href={href}>
      {label}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );

  return (
    <main id="main" className="tour">
      <div className="tour-body">
        <figure className="tour-map" data-tone={tones[active]}>
          <nav
            className="tour-progress"
            aria-label={t("Tour stops", "導覽站點")}
          >
            <ol>
              {ids.map((id, index) => (
                <li key={id}>
                  <a
                    href={`#stop-${id}`}
                    aria-current={active === id ? "step" : undefined}
                    aria-label={`${index + 1}. ${stopName[id]}`}
                    data-tone={tones[id]}
                  >
                    <span aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <figcaption className="tour-now" aria-live="off">
            {nowTitle[active]}
          </figcaption>
          <div className="tour-svg-wrap">
            <svg
              className="tour-svg"
              viewBox={`0 0 ${shapes.width} ${shapes.height}`}
              role="img"
              aria-label={`${t("Map of Taiwan’s counties", "臺灣各縣市地圖")}: ${nowTitle[active]}`}
            >
              <defs>
                <pattern
                  id={hatchId}
                  width="9"
                  height="9"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="9" height="9" fill="#f3efe8" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="9"
                    stroke="#a9a398"
                    strokeWidth="2.4"
                  />
                </pattern>
              </defs>
              {shapes.shapes
                .filter((shape) => offshore.includes(shape.code))
                .map((shape) => {
                  const empty =
                    active !== "yours" && layer?.fills[shape.code] === null;
                  const fill = fillFor(shape.code);
                  return (
                    <g key={`fat-${shape.code}`} aria-hidden="true">
                      <path
                        className="tour-fat-edge"
                        data-empty={empty ? "" : undefined}
                        d={shape.d}
                        fillRule="evenodd"
                      />
                      <path
                        className="tour-fat"
                        d={shape.d}
                        fillRule="evenodd"
                        style={{ fill, stroke: fill }}
                      />
                    </g>
                  );
                })}
              {shapes.shapes.map((shape) => (
                <path
                  key={shape.code}
                  className="tour-county"
                  data-code={shape.code}
                  data-empty={
                    active !== "yours" && layer?.fills[shape.code] === null
                      ? ""
                      : undefined
                  }
                  d={shape.d}
                  fillRule="evenodd"
                  style={{ fill: fillFor(shape.code) }}
                />
              ))}
              <g className="tour-dots" data-on={active === "people"}>
                <path className="tour-dots-halo" d={villageDots} />
                <path
                  className="tour-dots-dot"
                  d={villageDots}
                  style={{ stroke: villageColor }}
                />
              </g>
              {shapes.shapes
                .filter((shape) => highlight.includes(shape.code))
                .map((shape) => (
                  <path
                    key={`h-${shape.code}`}
                    className="tour-outline"
                    d={shape.d}
                    fillRule="evenodd"
                  />
                ))}
              {shapes.shapes
                .filter((shape) => offshore.includes(shape.code))
                .map((shape) => (
                  <text
                    key={`n-${shape.code}`}
                    className="tour-island"
                    x={(shape.box[0] + shape.box[2]) / 2}
                    y={shape.box[3] + 34}
                    textAnchor="middle"
                  >
                    {short(shape.code)}
                  </text>
                ))}
              {active === "taipei" &&
                shapes.shapes
                  .filter((shape) => shape.code === taipei.facts.code)
                  .map((shape) => (
                    <text
                      key="taipei-name"
                      className="tour-place"
                      x={shape.box[2] + 16}
                      y={(shape.box[1] + shape.box[3]) / 2}
                    >
                      {short(shape.code)}
                    </text>
                  ))}
            </svg>
          </div>
          <ul className="tour-legend" aria-label={t("Colour key", "顏色說明")}>
            {legend.map((item) => (
              <li key={item.color + item.label.en}>
                <span
                  className="tour-swatch"
                  data-dot={item.dot ? "" : undefined}
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                {zh ? item.label.zh : item.label.en}
              </li>
            ))}
            {hasGap && (
              <li>
                <span className="tour-swatch" data-gap="" aria-hidden="true" />
                {t("No data", "沒有資料")}
              </li>
            )}
          </ul>
        </figure>

        <div className="tour-steps">
          {step(
            "start",
            t(
              "Six things the open data shows, and a place to look for yourself.",
              "開放資料裡的六件事，再加一個讓你自己查的地方。",
            ),
            <>
              <p className="tour-lead">
                {t(
                  "Scroll down. The map beside the text changes with every stop. Each number is counted from the same files the rest of this site uses, and each stop says what its data cannot tell you.",
                  "往下捲動，文字旁的地圖會隨每一站改變。每個數字都來自本站其他頁面使用的同一批檔案，每一站也會說明那份資料沒辦法告訴你什麼。",
                )}
              </p>
              <p className="tour-aside">
                {t(
                  "About five minutes. Nothing plays by itself.",
                  "大約五分鐘，沒有任何東西會自己播放。",
                )}
              </p>
              <Link className="text-link" href="/explore">
                {t("Skip the tour and open the map", "略過導覽，直接開啟地圖")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>,
            1,
          )}

          {step(
            "air",
            t("The air is cleaner than it was.", "空氣比以前乾淨。"),
            <>
              {figure(
                `${minus(air.facts.dropPct)}${Math.abs(air.facts.dropPct)}%`,
                t(
                  `national yearly PM2.5, ${air.facts.firstYear} to ${air.facts.lastYear} (${one(air.facts.firstValue)} down to ${one(air.facts.lastValue)}\u00a0µg/m³)`,
                  `全國 PM2.5 年平均，${air.facts.firstYear} 至 ${air.facts.lastYear} 年（由 ${one(air.facts.firstValue)} 降到 ${one(air.facts.lastValue)}\u00a0µg/m³）`,
                ),
              )}
              <p>
                {t(
                  `The map shows ${air.facts.mapYear} by county; darker means more fine particles in the air. ${name(air.facts.highest.code)} was highest at ${one(air.facts.highest.value)} and ${name(air.facts.lowest.code)} lowest at ${one(air.facts.lowest.value)}\u00a0µg/m³.`,
                  `地圖是 ${air.facts.mapYear} 年各縣市的情況，顏色越深代表空氣中的細懸浮微粒越多。最高的是${name(air.facts.highest.code)}（${one(air.facts.highest.value)}），最低的是${name(air.facts.lowest.code)}（${one(air.facts.lowest.value)}\u00a0µg/m³）。`,
                )}
              </p>
              {limit(
                t(
                  "The national line and the county map use different methods, so they are never drawn on one axis. The national line leaves out 2020 and 2021 because the sources disagreed. A fall in a yearly average says nothing about one street or one bad day.",
                  "全國折線與縣市地圖採用不同的方法，所以不會畫在同一條軸上。全國折線略去 2020 與 2021 年，因為各來源的數字不一致。年平均下降，並不代表某一條街或某一個空污日也跟著變好。",
                ),
              )}
              {table("air", t("PM2.5 (µg/m³)", "PM2.5（µg/m³）"), one)}
              {more(
                "/environment/air-over-time",
                t("Open the air history", "開啟空氣歷史頁"),
              )}
            </>,
          )}

          {step(
            "warm",
            t("The island has warmed.", "島上變暖了。"),
            <>
              {figure(
                `${warm.facts.change >= 0 ? "+" : "−"}${Math.abs(warm.facts.change).toFixed(1)}\u00a0°C`,
                t(
                  `yearly average temperature, ${warm.facts.late.from}–${warm.facts.late.to} compared with ${warm.facts.early.from}–${warm.facts.early.to} (modelled, ${warm.facts.counted} counties)`,
                  `年平均氣溫，${warm.facts.late.from}–${warm.facts.late.to} 年對照 ${warm.facts.early.from}–${warm.facts.early.to} 年（模型估計，${warm.facts.counted} 個縣市）`,
                ),
              )}
              <p>
                {t(
                  `Each county is compared with its own ${warm.facts.early.from}–${warm.facts.early.to} average, so a cold mountain county and a warm coastal one start from the same shade and only the change shows. ${name(warm.facts.highest.code)} rose most (${degrees(warm.facts.highest.value, true)}\u00a0°C) and ${name(warm.facts.lowest.code)} least (${degrees(warm.facts.lowest.value, true)}\u00a0°C).`,
                  `每個縣市都和自己 ${warm.facts.early.from}–${warm.facts.early.to} 年的平均相比，所以寒冷的山區縣市與溫暖的沿海縣市會從同一個顏色開始，只呈現變化。上升最多的是${name(warm.facts.highest.code)}（${degrees(warm.facts.highest.value, true)}\u00a0°C），最少的是${name(warm.facts.lowest.code)}（${degrees(warm.facts.lowest.value, true)}\u00a0°C）。`,
                )}
              </p>
              {limit(
                t(
                  `This is a weather model, not a thermometer record, and one 10 km square stands for a whole county. ${list(warm.facts.missing)} came back with no values and are hatched. A single year is as much weather as climate; the full page shows whole decades.`,
                  `這是氣象模型的估計，不是溫度計的紀錄，一個 10 公里見方的格子代表整個縣市。${list(warm.facts.missing)}沒有模型數值，以斜線表示。單一年份有一部分是天氣而非氣候，完整頁面以十年為單位呈現。`,
                ),
              )}
              {table(
                "warm",
                t("Change in yearly temperature (°C)", "年平均氣溫變化（°C）"),
                (value) => degrees(value, true),
              )}
              {more(
                "/environment/temperature-over-time",
                t("Open the temperature history", "開啟氣溫歷史頁"),
              )}
            </>,
          )}

          {step(
            "forest",
            t("Forest is not spread evenly.", "森林分布並不平均。"),
            <>
              {figure(
                `${Math.round(forest.facts.highest.value)}%`,
                t(
                  `of ${name(forest.facts.highest.code)}’s mapped land is forest, against ${one(forest.facts.lowest.value)}% in ${name(forest.facts.lowest.code)}`,
                  `${name(forest.facts.highest.code)}已繪製土地的森林占比，${name(forest.facts.lowest.code)}則是 ${one(forest.facts.lowest.value)}%`,
                ),
              )}
              <p>
                {t(
                  `The shading is the share of each county’s mapped land that was forest in ${forest.facts.year}. ${name(forest.facts.highest.code)} is highest, at ${one(forest.facts.highest.value)}%; ${name(forest.facts.lowest.code)} is lowest, at ${one(forest.facts.lowest.value)}%.`,
                  `顏色代表各縣市已繪製土地中，${forest.facts.year} 年屬於森林的比例。最高的是${name(forest.facts.highest.code)}（${one(forest.facts.highest.value)}%），最低的是${name(forest.facts.lowest.code)}（${one(forest.facts.lowest.value)}%）。`,
                )}
              </p>
              {limit(
                t(
                  `Land cover says what is on the ground now, not how old, wild or healthy a forest is. ${list(forest.facts.unmapped)} were not covered by the land-cover map and are hatched.`,
                  `土地覆蓋只說明現在地面上是什麼，不代表森林多老、多原始或多健康。${list(forest.facts.unmapped)}不在土地覆蓋圖的範圍內，以斜線表示。`,
                ),
              )}
              {table(
                "forest",
                t("Forest share of mapped land (%)", "森林占已繪製土地（%）"),
                one,
              )}
              {more("/forests", t("Open the forest map", "開啟森林地圖"))}
            </>,
          )}

          {step(
            "roadkill",
            t(
              "Roadkill reports cluster in a few counties.",
              "路死通報集中在少數縣市。",
            ),
            <>
              {figure(
                `${roadkill.facts.topSharePct}%`,
                t(
                  `of ${num(roadkill.facts.total)} screened reports come from just three counties: ${list(roadkill.facts.top.map((row) => row.code))}`,
                  `在 ${num(roadkill.facts.total)} 筆經篩選的通報中，有這個比例來自三個縣市：${list(roadkill.facts.top.map((row) => row.code))}`,
                ),
              )}
              <p>
                {t(
                  `Darker counties have more reports in a screened subset covering ${years}. The top three are ${num(roadkill.facts.top[0].value)}, ${num(roadkill.facts.top[1].value)} and ${num(roadkill.facts.top[2].value)}.`,
                  `顏色越深的縣市，在 ${years} 年這份經篩選的子集中通報越多。前三名分別是 ${num(roadkill.facts.top[0].value)}、${num(roadkill.facts.top[1].value)} 與 ${num(roadkill.facts.top[2].value)} 筆。`,
                )}
              </p>
              {limit(
                t(
                  "These count reports, not roadkill risk or animal numbers. A county can have many reports simply because its roads were checked more closely, and counties differ widely in size and traffic. The records are screened and their positions generalised.",
                  "這裡數的是通報件數，不是路死風險，也不是動物數量。一個縣市通報多，可能只是因為道路被查得比較仔細，而且各縣市的面積與車流差異很大。資料經過篩選，位置也已概略化。",
                ),
              )}
              {table(
                "roadkill",
                t("Reports in the subset", "子集中的通報數"),
                num,
              )}
              {more(
                "/wildlife",
                t("Open the wildlife map", "開啟野生動物地圖"),
              )}
            </>,
          )}

          {step(
            "people",
            t("Where Indigenous villages are found.", "原住民族部落在哪裡。"),
            <>
              {figure(
                String(people.facts.peoples),
                t(
                  "peoples named in the list of Indigenous villages used here",
                  "本站使用的原住民族部落名單中列出的族群數",
                ),
              )}
              <p>
                {t(
                  `Each dot is one of the ${num(people.facts.villages)} village reference points from the Council of Indigenous Peoples. ${name(people.facts.top[0].code)} has ${num(people.facts.top[0].value)} and ${name(people.facts.top[1].code)} ${num(people.facts.top[1].value)}, more than any other county.`,
                  `每個點是原住民族委員會名單中 ${num(people.facts.villages)} 個部落參考點的其中一個。${name(people.facts.top[0].code)}有 ${num(people.facts.top[0].value)} 個，${name(people.facts.top[1].code)}有 ${num(people.facts.top[1].value)} 個，比其他縣市都多。`,
                )}
              </p>
              {limit(
                t(
                  "Dots are public reference points, not boundaries. They do not show traditional territory or where visitors may go, and community restrictions still apply. Villages whose coordinates were invalid or conflicting are left out rather than guessed.",
                  "圓點是公開的參考點，不是邊界，也不代表傳統領域或訪客可以前往的地方，各部落的規範仍然適用。座標無效或互相矛盾的部落會被排除，而不是猜測位置。",
                ),
              )}
              {table(
                "people",
                t("Villages in the list", "名單中的部落數"),
                num,
              )}
              {more(
                "/culture/peoples",
                t("Meet the sixteen peoples", "認識十六個族群"),
              )}
            </>,
          )}

          {step(
            "taipei",
            t("One city has counted its trees.", "有一座城市把樹都數過了。"),
            <>
              {figure(
                num(taipei.facts.trees),
                t(
                  `trees of ${taipei.facts.kinds} kinds in Taipei’s park and riverside surveys`,
                  `棵樹，共 ${taipei.facts.kinds} 種，取自臺北市公園與河濱調查`,
                ),
              )}
              <p>
                {t(
                  `Taipei’s open data lists ${num(taipei.facts.parks)} parks and a record for every surveyed tree. It is the only city whose inventories are in this atlas so far, which is why its city pages cover Taipei alone.`,
                  `臺北市的開放資料列出 ${num(taipei.facts.parks)} 座公園，並為每棵調查過的樹留下紀錄。它是目前本站唯一收錄樹木清冊的城市，所以城市頁面只有臺北。`,
                )}
              </p>
              {limit(
                t(
                  "This records what was surveyed, not every tree in the city. Other cities may publish their own data elsewhere; none of it is imported here.",
                  "這裡記錄的是調查到的樹，不是全市所有的樹。其他城市也許在別處公開自己的資料，但本站沒有匯入。",
                ),
              )}
              {more("/plants", t("Browse the trees", "瀏覽樹木"))}
            </>,
          )}

          {step(
            "yours",
            t("Now look at your own county.", "接下來看看你自己的縣市。"),
            <>
              <p className="tour-lead">
                {t(
                  "Pick a county to see what the atlas holds for it, side by side.",
                  "選一個縣市，並排看看本站為它收錄了哪些資料。",
                )}
              </p>
              <div className="tour-pick">
                <label htmlFor="tour-county">
                  {t("Choose a county", "選擇縣市")}
                </label>
                <select
                  id="tour-county"
                  value={pick}
                  onChange={(event) => setPick(event.target.value)}
                >
                  <option value="">{t("None chosen", "未選擇")}</option>
                  {sorted.map((county) => (
                    <option key={county.code} value={county.code}>
                      {zh ? county.zh : county.en}
                    </option>
                  ))}
                </select>
                <Link
                  className="button"
                  href={pick ? `/county/${pick}` : "/county"}
                >
                  {pick
                    ? t(`Open ${name(pick)}`, `開啟${name(pick)}`)
                    : t("See every county", "看所有縣市")}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
              <ul className="tour-next">
                <li>
                  {more("/explore", t("Open the full map", "開啟完整地圖"))}
                </li>
                <li>
                  {more(
                    "/teach",
                    t("Teach with these pages", "用這些頁面教學"),
                  )}
                </li>
                <li>
                  {more(
                    "/about",
                    t("How the data is checked", "資料如何被檢查"),
                  )}
                </li>
              </ul>
            </>,
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
