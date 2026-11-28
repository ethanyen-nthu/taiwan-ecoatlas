/**
 * A chart as a picture to put in a slide or a handout: the chart itself, a
 * title above it, its legend, and a line of source at the bottom, so the
 * numbers do not travel without where they came from. This file only lays
 * the pieces out and writes the SVG; reading the chart from the page is in
 * `src/components/trends/chart-picture.ts`.
 */
export interface LegendItem {
  label: string;
  color: string;
  dashed: boolean;
  swatch: "line" | "box";
}
export interface ChartPicture {
  /** The chart's own elements, with their styles written onto them. */
  markup: string;
  width: number;
  height: number;
  viewBox: string;
}
export interface ChartFrame {
  title: string;
  legend: LegendItem[];
  /** Each entry is one paragraph, wrapped to the picture's width. */
  sourceLines: string[];
  fontFamily: string;
}

export const margin = 28;
export const minWidth = 640;
const ink = "#16202b";
const muted = "#505963";
const paper = "#fefcf9";
const rule = "#bbb7af";

const wideRange =
  "\\u2E80-\\u9FFF\\uF900-\\uFAFF\\uFF00-\\uFFEF\\u3000-\\u303F";
const wide = new RegExp(`[${wideRange}]`);
const tokens = new RegExp(`[${wideRange}]|\\S+\\s*|\\s+`, "g");

/** A close estimate of how wide text is: a full em for Chinese, a little over
 *  half for everything else. It only decides where lines break. */
export const textWidth = (text: string, size: number) =>
  [...text].reduce(
    (sum, char) => sum + (wide.test(char) ? size : size * 0.56),
    0,
  );

/** Breaks text into lines no wider than `maxWidth`: at spaces for English,
 *  between any two characters for Chinese, and inside a single word only when
 *  that word alone is wider than the line. */
export function wrapText(text: string, maxWidth: number, size: number) {
  const lines: string[] = [];
  let line = "";
  const push = () => {
    if (line.trim()) lines.push(line.trimEnd());
    line = "";
  };
  for (const token of text.match(tokens) ?? []) {
    if (textWidth(token.trimEnd(), size) > maxWidth) {
      push();
      for (const char of token.trimEnd()) {
        if (textWidth(line + char, size) > maxWidth) push();
        line += char;
      }
      continue;
    }
    if (line && textWidth((line + token).trimEnd(), size) > maxWidth) {
      push();
      line = token.trimStart();
    } else line += token;
  }
  push();
  return lines.length ? lines : [""];
}

/** Browsers report a mixed colour as `color(srgb 0.55 0.74 0.83)`. Slide and
 *  drawing programs may not read that, so it is rewritten as plain rgb. */
export const plainColors = (text: string) =>
  text.replace(
    /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/g,
    (_match, r: string, g: string, b: string, alpha?: string) => {
      const part = (value: string) =>
        Math.round(Math.min(1, Math.max(0, Number(value))) * 255);
      const rgb = `${part(r)}, ${part(g)}, ${part(b)}`;
      return alpha === undefined || Number(alpha) >= 1
        ? `rgb(${rgb})`
        : `rgba(${rgb}, ${Number(alpha)})`;
    },
  );

export const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const number = (value: number) => Number(value.toFixed(1));

/** Puts the title, legend, chart and source line on one white page and
 *  returns it as SVG text with its size. */
export function composeChart(picture: ChartPicture, frame: ChartFrame) {
  const width = Math.max(minWidth, Math.round(picture.width) + margin * 2);
  const inner = width - margin * 2;
  const titleSize = 22;
  const legendSize = 14;
  const sourceSize = 12.5;
  const out: string[] = [];
  let y = margin;

  for (const line of wrapText(frame.title, inner, titleSize)) {
    out.push(
      `<text x="${margin}" y="${number(y + titleSize)}" font-size="${titleSize}" font-weight="700" fill="${ink}">${escapeXml(line)}</text>`,
    );
    y += titleSize * 1.3;
  }
  y += 10;

  if (frame.legend.length) {
    let x = margin;
    let baseline = y + legendSize;
    for (const item of frame.legend) {
      const label = textWidth(item.label, legendSize);
      const itemWidth = 34 + label;
      if (x > margin && x + itemWidth > margin + inner) {
        x = margin;
        baseline += legendSize * 1.8;
      }
      out.push(
        item.swatch === "line"
          ? `<line x1="${number(x)}" x2="${number(x + 26)}" y1="${number(baseline - 5)}" y2="${number(baseline - 5)}" stroke="${escapeXml(item.color)}" stroke-width="3"${item.dashed ? ' stroke-dasharray="6 4"' : ""}/>`
          : `<rect x="${number(x)}" y="${number(baseline - 12)}" width="26" height="12" fill="${escapeXml(item.color)}"/>`,
        `<text x="${number(x + 34)}" y="${number(baseline)}" font-size="${legendSize}" fill="${ink}">${escapeXml(item.label)}</text>`,
      );
      x += itemWidth + 22;
    }
    y = baseline + 14;
  }

  const left = margin + Math.max(0, (inner - picture.width) / 2);
  out.push(
    `<svg x="${number(left)}" y="${number(y)}" width="${number(picture.width)}" height="${number(picture.height)}" viewBox="${escapeXml(picture.viewBox)}" overflow="visible">${picture.markup}</svg>`,
  );
  y += picture.height + 16;

  out.push(
    `<line x1="${margin}" x2="${margin + inner}" y1="${number(y)}" y2="${number(y)}" stroke="${rule}"/>`,
  );
  y += 8;
  for (const paragraph of frame.sourceLines) {
    for (const line of wrapText(paragraph, inner, sourceSize)) {
      out.push(
        `<text x="${margin}" y="${number(y + sourceSize)}" font-size="${sourceSize}" fill="${muted}">${escapeXml(line)}</text>`,
      );
      y += sourceSize * 1.5;
    }
    y += 3;
  }

  const height = Math.ceil(y + margin - 6);
  const family = escapeXml(frame.fontFamily.replaceAll('"', "'"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${family}"><rect width="${width}" height="${height}" fill="${paper}"/>${out.join("")}</svg>`;
  return { svg, width, height };
}
