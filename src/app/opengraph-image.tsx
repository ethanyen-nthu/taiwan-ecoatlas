import { ImageResponse } from "next/og";
import { degrees } from "@/lib/temperature-history";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { cardFonts } from "@/server/county-card";
import { loadTour } from "@/server/tour";

export const alt =
  "Taiwan EcoAtlas: open environmental data, with its limits shown";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const paper = "#f8f5f1";
const ink = "#16202b";
const muted = "#505963";
const line = "#bbb7af";

const signed = (value: number) =>
  value === 0 ? "0" : `${value < 0 ? "−" : "+"}${Math.abs(value)}`;

/** The picture a link to any page without a card of its own shows. The two
 *  figures are the tour's own, so the picture says what the tour says. */
export default async function Image() {
  const [{ tour }, [regular, bold]] = await Promise.all([
    loadTour(),
    cardFonts(),
  ]);
  const { air, warm } = tour;
  const rows = [
    {
      zh: "全國 PM2.5 年平均",
      en: `National PM2.5, ${air.facts.firstYear}–${air.facts.lastYear}`,
      value: `${signed(air.facts.dropPct)}%`,
      color: "#1a7cb0",
    },
    {
      zh: "氣溫變化",
      en: `Warming, ${warm.facts.late.from}–${warm.facts.late.to} vs ${warm.facts.early.from}–${warm.facts.early.to}`,
      value: `${degrees(warm.facts.change, true)} °C`,
      color: "#1a7cb0",
    },
  ];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: paper,
        color: ink,
        fontFamily: "Card",
        padding: "56px 64px 44px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
        <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>
          Taiwan EcoAtlas
        </div>
        <div style={{ fontSize: 46, color: muted, marginTop: 8 }}>
          臺灣環境與文化地圖
        </div>
        <div style={{ fontSize: 34, marginTop: 28, lineHeight: 1.3 }}>
          Open environmental data, with its limits shown.
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", marginTop: 34 }}
        >
          {rows.map((row) => (
            <div
              key={row.zh}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 70,
                borderTop: `2px solid ${line}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 8,
                    height: 40,
                    background: row.color,
                    marginRight: 18,
                  }}
                />
                <div style={{ fontSize: 28, fontWeight: 700 }}>{row.zh}</div>
                <div style={{ fontSize: 23, color: muted, marginLeft: 14 }}>
                  {row.en}
                </div>
              </div>
              <div style={{ fontSize: 42, fontWeight: 700 }}>{row.value}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 22,
            color: muted,
          }}
        >
          taiwan-ecoatlas.vercel.app
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={248} height={465} viewBox={islandViewBox}>
          <path
            d={islandPath}
            fill={ink}
            stroke={ink}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Card", data: regular, weight: 400, style: "normal" },
        { name: "Card", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
