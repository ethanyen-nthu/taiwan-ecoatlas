"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLanguage, useObservations } from "./providers";
import {
  forestImageBox,
  islandPath,
  islandPoint,
  islandViewBox,
} from "@/lib/island-path";
import type { JourneyMarks } from "@/server/journey";
import "./home-journey.css";

export interface JourneyFacts {
  wildlifeRecords: number;
  species: number;
  firstYear: string;
  lastYear: string;
  villages: number;
  groups: number;
  parks: number;
  plantTrees: number;
  plantKinds: number;
  forestTop: { en: string; zh: string; sharePct: number } | null;
}
type Tone =
  "environment" | "forests" | "wildlife" | "plants" | "culture" | "urban";

/** A number that counts up once, the first time it scrolls into view. The
 *  final figure is in the server HTML; nothing changes if motion is reduced. */
function Count({
  value,
  suffix = "",
  locale,
}: {
  value: number;
  suffix?: string;
  locale: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = `${value.toLocaleString(locale)}${suffix}`;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      node.getBoundingClientRect().top < window.innerHeight * 0.9
    )
      return;
    node.textContent = `${(0).toLocaleString(locale)}${suffix}`;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / 1100);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent =
          progress < 1
            ? `${Math.round(value * eased).toLocaleString(locale)}${suffix}`
            : text;
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = text;
    };
  }, [value, suffix, locale, text]);
  return <span ref={ref}>{text}</span>;
}

function stationPath(
  observations: { longitude: number; latitude: number }[] | undefined,
) {
  return (observations || [])
    .filter(
      (item) =>
        Number.isFinite(item.longitude) &&
        item.longitude > 119.9 &&
        item.longitude < 122.2 &&
        item.latitude > 21.7 &&
        item.latitude < 25.5,
    )
    .map((item) => {
      const [x, y] = islandPoint(item.longitude, item.latitude);
      return `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
    })
    .join("");
}

export function HomeJourney({
  facts,
  marks,
}: {
  facts: JourneyFacts;
  marks: JourneyMarks;
}) {
  const { t, language } = useLanguage();
  const locale = language === "en" ? "en" : "zh-TW";
  const aqi = useObservations("aqi");
  const weather = useObservations("weather");
  const [active, setActive] = useState<Tone>("environment");
  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});
  const aqiDots = useMemo(
    () => stationPath(aqi.data?.observations),
    [aqi.data],
  );
  const weatherDots = useMemo(
    () => stationPath(weather.data?.observations),
    [weather.data],
  );
  const stations = aqi.data?.observations.length || 0;
  const forest = forestImageBox();
  const [taipeiX, taipeiY] = islandPoint(121.55, 25.06);

  const chapters: {
    tone: Tone;
    href: string;
    title: string;
    what: string;
    key: string;
    learn: string[];
    go: string;
    number: React.ReactNode;
    label: string;
    note: string;
  }[] = [
    {
      tone: "environment",
      href: "/environment",
      title: t("The air we share", "我們呼吸的空氣"),
      what: t(
        "Live readings from the official air-quality and weather stations, with the counties tinted by what their stations report.",
        "官方空品與氣象測站的即時讀數，縣市底色依轄內測站的回報而定。",
      ),
      key: t(
        "Each dot is one station reporting now.",
        "每個點是一個目前回報的測站。",
      ),
      learn: [
        t(
          "How clean the air is in each county right now.",
          "此刻各縣市的空氣乾淨程度。",
        ),
        t(
          "What AQI, PM₂.₅, rain and wind figures actually measure.",
          "AQI、PM₂.₅、雨量與風速各自量的是什麼。",
        ),
        t(
          "Why mountains, plains and coast read differently on the same day.",
          "為什麼同一天山區、平原與海岸的讀數不一樣。",
        ),
      ],
      go: t("Open the air and weather map", "開啟空氣與氣象地圖"),
      number: stations ? (
        <Count value={stations} locale={locale} />
      ) : (
        t("Live", "即時")
      ),
      label: stations
        ? t("air-quality stations reporting now", "個空品測站目前回報")
        : t(
            "air, weather and river data as the agencies report it",
            "空品、氣象與河川資料，依機關回報",
          ),
      note: t(
        "Live stations; counties are tinted by their station average.",
        "即時測站；縣市底色為轄內測站平均。",
      ),
    },
    {
      tone: "forests",
      href: "/forests",
      title: t("Where the forest is", "森林在哪裡"),
      what: t(
        "The 2023 land-cover map. Every green speck is mapped forest, so you can see where it is dense and where it thins out.",
        "2023 年土地覆蓋圖。每個綠色細點都是被標為森林之處，可以看出哪裡濃密、哪裡稀疏。",
      ),
      key: t(
        "Dense in the central mountains and east, thin on the western plains.",
        "中央山脈與東部濃密，西部平原稀疏。",
      ),
      learn: [
        t(
          "How counties compare in the share of land mapped as forest.",
          "各縣市被標為森林的土地比例如何比較。",
        ),
        t(
          "What the other land-cover classes are: built-up, water, farmland and shrub.",
          "其他土地覆蓋類別是什麼：建成地、水域、農地與灌叢。",
        ),
        t(
          "Why a research map class is not a legal forest.",
          "為什麼研究地圖分類不等於法定森林。",
        ),
      ],
      go: t("Open the forest map", "開啟森林地圖"),
      number: facts.forestTop ? (
        <Count
          value={Math.round(facts.forestTop.sharePct)}
          suffix="%"
          locale={locale}
        />
      ) : (
        "—"
      ),
      label: facts.forestTop
        ? t(
            `of ${facts.forestTop.en} is forest in the 2023 map, the highest of the counties with data`,
            `${facts.forestTop.zh}的面積在 2023 年地圖中為森林，為有資料縣市中最高`,
          )
        : "",
      note: t(
        "Forest pixels from the 2023 research classification.",
        "取自 2023 年研究分類的森林像元。",
      ),
    },
    {
      tone: "wildlife",
      href: "/wildlife",
      title: t("Life along the roads", "道路旁的生命"),
      what: t(
        "Roadkill records, 2014–2017. Each square is a 10 km area; the darker it is, the more records fall in it.",
        "2014–2017 年的路死紀錄。每個方格是 10 公里的範圍，顏色越深，紀錄越多。",
      ),
      key: t(
        "Positions are generalised on purpose, so no square is a sighting.",
        "位置刻意概化，因此沒有任何方格代表實際發現點。",
      ),
      learn: [
        t(
          `Which of ${facts.species} animals are recorded most often.`,
          `${facts.species} 種動物中，哪些最常被記錄。`,
        ),
        t(
          "Where roads cut through the places animals live.",
          "道路在哪些動物棲地上切過。",
        ),
        t(
          "Tap any animal for its Chinese name, photos and description.",
          "點選任何動物，看中文名稱、照片與介紹。",
        ),
      ],
      go: t("Open the wildlife map", "開啟野生動物地圖"),
      number: <Count value={facts.wildlifeRecords} locale={locale} />,
      label: t(
        `roadside records of ${facts.species} species, ${facts.firstYear}–${facts.lastYear}`,
        `筆路旁紀錄，涵蓋 ${facts.species} 種，${facts.firstYear}–${facts.lastYear}`,
      ),
      note: t(
        `${marks.offshoreCells} squares on offshore islands are not drawn here; they are on the map.`,
        `外島的 ${marks.offshoreCells} 個方格未畫在此處，地圖上看得到。`,
      ),
    },
    {
      tone: "plants",
      href: "/plants",
      title: t("The trees of Taipei", "臺北的樹"),
      what: t(
        "A guide to every kind of tree surveyed in Taipei’s parks and along its rivers, with a page and photos for each.",
        "臺北市公園與河濱調查到的每一種樹的導覽，每種各有專頁與照片。",
      ),
      key: t(
        "The dots are Taipei’s parks, the only place with a tree inventory here so far.",
        "圓點是臺北的公園，目前只有這裡有樹木清冊。",
      ),
      learn: [
        t("Which trees make up the city’s shade.", "城市的樹蔭由哪些樹組成。"),
        t(
          "Native or introduced, evergreen or deciduous, palm or conifer.",
          "原生或外來、常綠或落葉、棕櫚或針葉。",
        ),
        t(
          "How tall and how wide each kind grows in a park.",
          "每種樹在公園裡長到多高、多粗。",
        ),
      ],
      go: t("Browse the trees", "瀏覽樹種"),
      number: <Count value={facts.plantTrees} locale={locale} />,
      label: t(
        `trees of ${facts.plantKinds} kinds in Taipei’s park and riverside surveys`,
        `棵樹，共 ${facts.plantKinds} 種，取自臺北市公園與河濱調查`,
      ),
      note: t("Taipei’s park reference points.", "臺北市公園的參考點。"),
    },
    {
      tone: "culture",
      href: "/culture",
      title: t("People and place", "人與地方"),
      what: t(
        "Public reference points for Indigenous villages, with guides to the sixteen officially recognised peoples.",
        "原住民族部落的公開定位點，以及十六個官方認定族群的導覽。",
      ),
      key: t(
        "A point places a village, not a traditional territory.",
        "定位點標示部落位置，不代表傳統領域。",
      ),
      learn: [
        t(
          "Who the sixteen peoples are, one page each.",
          "十六個族群是誰，每族一頁。",
        ),
        t(
          "Where villages sit and how the source names them.",
          "部落位在哪裡，來源如何稱呼它們。",
        ),
        t(
          "How historical trails and studies connect places.",
          "歷史古道與研究如何連結各地。",
        ),
      ],
      go: t("Open the cultural map", "開啟文化地圖"),
      number: <Count value={facts.villages} locale={locale} />,
      label: t(
        `village reference points, filed under ${facts.groups} group labels in the source`,
        `個部落定位點，來源列有 ${facts.groups} 個族別標示`,
      ),
      note: t(
        "Reference points from the public village catalogue.",
        "取自公開部落名錄的定位點。",
      ),
    },
    {
      tone: "urban",
      href: "/urban",
      title: t("Greener everyday spaces", "更綠的日常空間"),
      what: t(
        "Weather stations across the island, and Taipei’s parks and trees: the one city whose inventories are included so far.",
        "遍布全島的氣象測站，加上臺北的公園與樹木：目前唯一納入清冊的城市。",
      ),
      key: t(
        "Dashed ring: Taipei. The page explains why other cities are not here yet.",
        "虛線圈是臺北。頁面會說明為什麼其他城市還沒有。",
      ),
      learn: [
        t("Where Taipei’s parks are.", "臺北的公園在哪裡。"),
        t(
          "How warm different parts of the island run on the same day.",
          "同一天島內各地的氣溫差多少。",
        ),
        t(
          "Why only Taipei, and where other cities publish their data.",
          "為什麼只有臺北，以及其他城市在哪裡公布資料。",
        ),
      ],
      go: t("Open the city page", "開啟城市頁面"),
      number: <Count value={facts.parks} locale={locale} />,
      label: t("parks in Taipei’s open-data list", "座臺北市開放資料中的公園"),
      note: t(
        "Live weather stations; dashed ring marks Taipei.",
        "即時氣象測站；虛線圈標出臺北。",
      ),
    },
  ];

  useEffect(() => {
    const nodes = chapters.map((chapter) => chapterRefs.current[chapter.tone]);
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(entry.target.getAttribute("data-chapter") as Tone);
      },
      { rootMargin: "-42% 0px -48% 0px" },
    );
    for (const node of nodes) if (node) observer.observe(node);
    return () => observer.disconnect();
    // The chapter list is rebuilt each render; only its order matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = chapters.find((chapter) => chapter.tone === active)!;
  return (
    <section className="journey-band" data-active={active}>
      <div className="journey-heading">
        <h2>
          {t(
            "Six ways into the island, each with its own limits.",
            "走進這座島的六條路，各有各的資料限制。",
          )}
        </h2>
        <p>
          {t(
            "Scroll. The island changes with each subject, and every chapter says what is drawn, what you can learn and what it cannot tell you.",
            "往下捲動。島嶼會隨每個主題改變，每一章都說明畫了什麼、能學到什麼，以及哪些事它說不了。",
          )}
        </p>
      </div>
      <div className="journey">
        <div className="journey-stage">
          <div className="journey-frame" aria-hidden="true">
            <svg
              className="journey-island"
              viewBox={islandViewBox}
              focusable="false"
            >
              <path className="journey-land" d={islandPath} />
              <g className="journey-layer" data-layer="environment">
                <path className="j-dots j-air" d={aqiDots} />
              </g>
              <g className="journey-layer" data-layer="wildlife">
                {marks.cells.map((d, index) => (
                  <path
                    key={index}
                    className={`j-cell j-cell-${index}`}
                    d={d}
                  />
                ))}
              </g>
              <g className="journey-layer" data-layer="plants">
                <path className="j-dots j-parks" d={marks.parks} />
              </g>
              <g className="journey-layer" data-layer="culture">
                <path className="j-dots j-villages" d={marks.villages} />
              </g>
              <g className="journey-layer" data-layer="urban">
                <path className="j-dots j-weather" d={weatherDots} />
              </g>
              <g className="journey-layer" data-layer="taipei">
                <circle className="j-ring" cx={taipeiX} cy={taipeiY} r="8" />
                <text className="j-ring-label" x={taipeiX + 11} y={taipeiY + 2}>
                  {t("Taipei", "臺北")}
                </text>
              </g>
            </svg>
            {/* A pre-built overview picture, positioned in percentages and loaded lazily; the image optimiser would only resample its specks. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="journey-forest"
              src="/data/atlas/forest-cover-2023.png"
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                left: `${forest.left}%`,
                top: `${forest.top}%`,
                width: `${forest.width}%`,
                height: `${forest.height}%`,
              }}
            />
          </div>
          <p className="journey-note" aria-hidden="true">
            {current.note}
          </p>
          <ol className="journey-nav" aria-label={t("Chapters", "章節")}>
            {chapters.map((chapter, index) => (
              <li key={chapter.tone}>
                <a
                  href={`#chapter-${chapter.tone}`}
                  data-tone={chapter.tone}
                  aria-current={chapter.tone === active ? "true" : undefined}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {chapter.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
        <div className="journey-chapters">
          {chapters.map((chapter, index) => (
            <article
              key={chapter.tone}
              id={`chapter-${chapter.tone}`}
              className="journey-chapter"
              data-tone={chapter.tone}
              data-chapter={chapter.tone}
              ref={(node) => {
                chapterRefs.current[chapter.tone] = node;
              }}
            >
              <p className="journey-index">
                {String(index + 1).padStart(2, "0")} / {chapters.length}
              </p>
              <h3>{chapter.title}</h3>
              <p className="journey-number">
                <strong>{chapter.number}</strong>
                <span>{chapter.label}</span>
              </p>
              <p className="journey-what">{chapter.what}</p>
              <p className="journey-key">{chapter.key}</p>
              <h4>{t("What you can learn", "你可以從中認識")}</h4>
              <ul>
                {chapter.learn.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link className="journey-go" href={chapter.href}>
                {chapter.go}
                <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
