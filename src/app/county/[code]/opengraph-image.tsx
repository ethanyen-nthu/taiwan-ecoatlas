import { ImageResponse } from "next/og";
import { shareLines, type CardTone } from "@/lib/county-card";
import { silhouette } from "@/lib/silhouette";
import {
  cardFonts,
  loadCountyCard,
  loadCountyCodes,
  loadOutlines,
} from "@/server/county-card";

export const alt = "A county's air, warming, forest and roadkill figures";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await loadCountyCodes()).map((code) => ({ code }));
}

const paper = "#f8f5f1";
const ink = "#16202b";
const muted = "#505963";
const line = "#bbb7af";
const rule: Record<CardTone, string> = {
  environment: "#1a7cb0",
  forests: "#4b853e",
  wildlife: "#a06a08",
  culture: "#ae5843",
  urban: "#0a8685",
};

/** The picture a link to a county page shows in LINE and other chat apps. */
export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [data, outlines, [regular, bold]] = await Promise.all([
    loadCountyCard(code),
    loadOutlines(),
    cardFonts(),
  ]);
  if (!data) throw new Error(`Unknown county ${code}`);
  const outline = outlines[code];
  const shape = outline
    ? silhouette(outline, { width: 330, height: 460 })
    : null;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: paper,
        color: ink,
        fontFamily: "Card",
        padding: "44px 56px 36px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Taiwan EcoAtlas</div>
          <div style={{ fontSize: 24, color: muted, marginLeft: 16 }}>
            臺灣環境與文化地圖
          </div>
        </div>
        <div
          style={{
            fontSize: 124,
            fontWeight: 700,
            lineHeight: 1.08,
            marginTop: 22,
          }}
        >
          {data.zh}
        </div>
        <div style={{ fontSize: 42, color: muted, marginTop: 2 }}>
          {data.en}
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", marginTop: 26 }}
        >
          {shareLines(data).map((row) => (
            <div
              key={row.zh}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 56,
                borderTop: `2px solid ${line}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 8,
                    height: 34,
                    background: rule[row.tone],
                    marginRight: 16,
                  }}
                />
                <div style={{ fontSize: 27, fontWeight: 700 }}>{row.zh}</div>
                <div style={{ fontSize: 22, color: muted, marginLeft: 14 }}>
                  {row.en}
                </div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{row.value}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 21,
            color: muted,
          }}
        >
          taiwan-ecoatlas.vercel.app · 每個數字都附來源與限制
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
        {shape && (
          <svg
            width={shape.width}
            height={shape.height}
            viewBox={`0 0 ${shape.width} ${shape.height}`}
          >
            <path d={shape.d} fill={ink} />
          </svg>
        )}
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
