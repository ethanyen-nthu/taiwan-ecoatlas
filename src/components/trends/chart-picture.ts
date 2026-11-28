import {
  plainColors,
  type ChartPicture,
  type LegendItem,
} from "@/lib/chart-export";

/** The style properties a chart's SVG needs to look the same away from the
 *  page's stylesheet. Computed values, so colours from the site's variables
 *  are written out as plain colours. */
const properties = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-variant-numeric",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "paint-order",
];

function inlineStyles(source: Element, copy: Element) {
  const computed = getComputedStyle(source);
  if (computed.display === "none") {
    copy.remove();
    return;
  }
  const style = properties
    .map((name) => [name, computed.getPropertyValue(name)] as const)
    .filter(([, value]) => value !== "")
    .map(([name, value]) => `${name}:${plainColors(value)}`)
    .join(";");
  if (style) copy.setAttribute("style", style);
  // The styles are written onto the element, so the class is no longer needed.
  copy.removeAttribute("class");
  const from = Array.from(source.children);
  const to = Array.from(copy.children);
  from.forEach((child, index) => {
    if (to[index]) inlineStyles(child, to[index]);
  });
}

export interface ChartRead {
  picture: ChartPicture;
  legend: LegendItem[];
  caption: string;
  fontFamily: string;
}

/** Charts that offer a picture are marked data-chart on the element that
 *  holds both the legend and the drawing. */
export function findCharts(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("main [data-chart]"),
  ).filter((root) => !root.closest("[data-cite]"));
}

function legendOf(root: HTMLElement): LegendItem[] {
  return Array.from(root.querySelectorAll("[data-chart-legend] li")).flatMap(
    (item) => {
      const key = item.querySelector("i");
      const label = (item.textContent ?? "").trim();
      if (!key || !label) return [];
      const style = getComputedStyle(key);
      const line =
        parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== "none";
      return [
        {
          label,
          color: plainColors(
            line ? style.borderTopColor : style.backgroundColor,
          ),
          dashed: style.borderTopStyle === "dashed",
          swatch: line ? ("line" as const) : ("box" as const),
        },
      ];
    },
  );
}

/** What a chart's heading says, for naming its picture. */
export function captionOf(root: HTMLElement, fallback: string): string {
  const heading = root
    .closest("section")
    ?.querySelector("h2, h3")
    ?.textContent?.trim();
  return heading || fallback;
}

export function readChart(root: HTMLElement): ChartRead | null {
  const svg = root.querySelector<SVGSVGElement>("svg[role='img']");
  if (!svg) return null;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, copy);
  // Marks that only exist while a pointer or the keyboard is on the chart.
  copy.querySelectorAll(".lc-pick, .lc-guide").forEach((node) => node.remove());
  const box = svg.viewBox.baseVal;
  const width = box.width || svg.width.baseVal.value;
  const height = box.height || svg.height.baseVal.value;
  if (!width || !height) return null;
  const text = new XMLSerializer().serializeToString(copy);
  const markup = text.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return {
    picture: {
      markup,
      width,
      height,
      viewBox: `${box.x || 0} ${box.y || 0} ${width} ${height}`,
    },
    legend: legendOf(root),
    caption: captionOf(root, svg.getAttribute("aria-label") ?? "Chart"),
    fontFamily: getComputedStyle(document.body).fontFamily,
  };
}

/** Draws the finished SVG onto a canvas, twice as large for sharpness. */
export async function toPng(
  svg: string,
  width: number,
  height: number,
  scale = 2,
): Promise<Blob> {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No picture"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
