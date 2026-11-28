import { describe, expect, it } from "vitest";
import {
  composeChart,
  escapeXml,
  margin,
  minWidth,
  plainColors,
  textWidth,
  wrapText,
  type ChartFrame,
  type ChartPicture,
} from "@/lib/chart-export";

describe("textWidth", () => {
  it("counts a Chinese character as a full em and a Latin one as a little over half", () => {
    expect(textWidth("臺北", 10)).toBe(20);
    expect(textWidth("ab", 10)).toBeCloseTo(11.2);
    expect(textWidth("", 10)).toBe(0);
  });
});

describe("wrapText", () => {
  it("breaks English at spaces and keeps every word", () => {
    const text =
      "Annual average PM2.5 across the national stations, 2013 to 2025";
    const lines = wrapText(text, 200, 14);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(textWidth(line, 14)).toBeLessThanOrEqual(200);
    expect(lines.join(" ")).toBe(text);
  });
  it("breaks Chinese between any two characters", () => {
    const text = "臺灣 PM2.5 年平均濃度折線圖，自二〇一三年起逐年下降";
    const lines = wrapText(text, 120, 14);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(textWidth(line, 14)).toBeLessThanOrEqual(120);
    expect(lines.join("").replaceAll(" ", "")).toBe(text.replaceAll(" ", ""));
  });
  it("splits a single word only when it is wider than a line", () => {
    const word = "https://taiwan-ecoatlas.vercel.app/environment/temperature";
    const lines = wrapText(word, 100, 12);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(textWidth(line, 12)).toBeLessThanOrEqual(100);
    expect(lines.join("")).toBe(word);
  });
  it("gives one empty line for no text", () => {
    expect(wrapText("", 100, 12)).toEqual([""]);
    expect(wrapText("   ", 100, 12)).toEqual([""]);
  });
});

describe("escapeXml", () => {
  it("escapes what would break SVG text and attributes", () => {
    expect(escapeXml(`a & b < c > "d"`)).toBe(
      "a &amp; b &lt; c &gt; &quot;d&quot;",
    );
  });
});

describe("composeChart", () => {
  const picture: ChartPicture = {
    markup: '<polyline points="0,0 10,10" style="stroke:rgb(1, 2, 3)"/>',
    width: 700,
    height: 320,
    viewBox: "0 0 700 320",
  };
  const frame: ChartFrame = {
    title: "Yearly mean temperature, Taipei & Hualien",
    legend: [
      {
        label: "Annual mean",
        color: "rgb(26, 124, 176)",
        dashed: false,
        swatch: "line",
      },
      {
        label: "1950–79 average",
        color: "rgb(80, 89, 99)",
        dashed: true,
        swatch: "line",
      },
      {
        label: "Gap years",
        color: "rgb(240, 236, 229)",
        dashed: false,
        swatch: "box",
      },
    ],
    sourceLines: [
      "Source: Taiwan EcoAtlas, Temperature over time. https://taiwan-ecoatlas.vercel.app/environment/temperature-over-time",
      "Underlying data: Open-Meteo. Accessed 28 November 2026.",
    ],
    fontFamily: 'system-ui, "Segoe UI", "PingFang TC", sans-serif',
  };
  const { svg, width, height } = composeChart(picture, frame);

  it("is as wide as the chart plus margins, and never narrower than the minimum", () => {
    expect(width).toBe(700 + margin * 2);
    expect(composeChart({ ...picture, width: 300 }, frame).width).toBe(
      minWidth,
    );
    expect(height).toBeGreaterThan(picture.height + 80);
    expect(svg).toContain(`width="${width}" height="${height}"`);
  });

  it("carries the title, every key, the chart once and every source line", () => {
    expect(svg).toContain("Yearly mean temperature, Taipei &amp; Hualien");
    for (const item of frame.legend) expect(svg).toContain(item.label);
    expect(svg.split(picture.markup)).toHaveLength(2);
    expect(svg).toContain('viewBox="0 0 700 320"');
    expect(svg).toContain("Underlying data: Open-Meteo");
    expect(svg).toContain("Accessed 28 November 2026");
    // The long address wrapped onto more than one line rather than running off.
    expect(svg).toContain("Source: Taiwan EcoAtlas");
    expect(svg).toContain("temperature-over-time");
  });

  it("draws a dashed line key, a plain line key and a box key", () => {
    expect(svg.match(/stroke-dasharray="6 4"/g)).toHaveLength(1);
    expect(svg.match(/<line [^>]*stroke-width="3"/g)).toHaveLength(2);
    expect(svg.match(/<rect x="[^"]*" y="[^"]*" width="26"/g)).toHaveLength(1);
  });

  it("starts a new row of keys when they do not fit", () => {
    const many = composeChart(picture, {
      ...frame,
      legend: Array.from({ length: 8 }, (_, i) => ({
        label: `A long series name number ${i + 1}`,
        color: "rgb(0, 0, 0)",
        dashed: false,
        swatch: "line" as const,
      })),
    });
    const ys = [
      ...many.svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" font-size="14"/g),
    ].map((match) => Number(match[1]));
    expect(new Set(ys).size).toBeGreaterThan(1);
    expect(many.height).toBeGreaterThan(height);
  });

  it("writes the font stack with single quotes so the attribute stays valid", () => {
    expect(svg).toContain(
      "font-family=\"system-ui, 'Segoe UI', 'PingFang TC', sans-serif\"",
    );
  });

  it("works with no legend and no source lines, and never writes NaN", () => {
    const bare = composeChart(picture, {
      ...frame,
      legend: [],
      sourceLines: [],
    });
    expect(bare.svg).not.toMatch(/NaN|undefined/);
    expect(bare.height).toBeLessThan(height);
    expect(svg).not.toMatch(/NaN|undefined/);
  });

  it("wraps a Chinese title to the picture's width", () => {
    const zh = composeChart(picture, {
      ...frame,
      title:
        "臺灣各縣市年平均氣溫，近三十年與一九五〇至一九七九年平均的差異，依縣市排列並標示資料缺漏的縣市",
    });
    expect(zh.svg.match(/font-size="22"/g)!.length).toBeGreaterThan(1);
  });
});

describe("plainColors", () => {
  it("rewrites a mixed colour as rgb, with alpha when it is not opaque", () => {
    expect(plainColors("color(srgb 0.54902 0.737255 0.833333)")).toBe(
      "rgb(140, 188, 212)",
    );
    expect(plainColors("color(srgb 0 0 0 / 0.5)")).toBe("rgba(0, 0, 0, 0.5)");
    expect(plainColors("color(srgb 1 1 1 / 1)")).toBe("rgb(255, 255, 255)");
  });
  it("leaves ordinary colours and other text alone", () => {
    expect(plainColors("rgb(26, 124, 176)")).toBe("rgb(26, 124, 176)");
    expect(plainColors("fill:none;stroke:#fff")).toBe("fill:none;stroke:#fff");
  });
  it("keeps every colour in a longer style string", () => {
    expect(
      plainColors(
        "fill:color(srgb 1 0 0);stroke:color(srgb 0 0 1 / 0.25);opacity:1",
      ),
    ).toBe("fill:rgb(255, 0, 0);stroke:rgba(0, 0, 255, 0.25);opacity:1");
  });
});
