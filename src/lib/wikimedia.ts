/**
 * Live photos and summaries from Wikipedia and Wikimedia Commons.
 *
 * The browser asks Wikimedia directly (their API allows anonymous cross-origin
 * reads), so nothing is stored in this repository and every picture keeps the
 * credit and licence its photographer gave it on Commons.
 */
export interface WikiPhoto {
  src: string;
  width: number;
  height: number;
  /** Commons file page, where the full credit and licence live. */
  page: string;
  artist: string;
  license: string;
  licenseUrl: string | null;
  name: string;
}
export interface WikiResult {
  lang: "en" | "zh";
  title: string;
  url: string;
  extract: string;
  photos: WikiPhoto[];
}

const skip =
  /(flag|logo|icon|symbol|map|range|distribution|status|iucn|cscr|commons|wikispecies|question|ambox|edit|portal|nuvola|stub|crystal|folder|lock|padlock|disambig|wiktionary|wikiquote|sound|speaker|svg|text_document|increase|decrease|steady|red_pencil|taxonomy|diagram|chart|skull|drawing|illustration)/i;

type Page = {
  missing?: string;
  title?: string;
  fullurl?: string;
  extract?: string;
  pageprops?: Record<string, string>;
  pageimage?: string;
  images?: { title: string }[];
  imagerepository?: string;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};
type Reply = { query?: { pages?: Record<string, Page> } };

function endpoint(lang: "en" | "zh", params: Record<string, string>) {
  const query = new URLSearchParams({
    format: "json",
    origin: "*",
    action: "query",
    ...params,
  });
  return `https://${lang}.wikipedia.org/w/api.php?${query}`;
}
async function ask(url: string, signal?: AbortSignal): Promise<Reply> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Wikimedia ${response.status}`);
  return response.json();
}
function plain(html: string | undefined): string {
  if (!html) return "";
  return (
    new DOMParser().parseFromString(html, "text/html").body.textContent || ""
  )
    .replace(/\s+/g, " ")
    .trim();
}
/** Wikimedia now serves resized photos from thumb.wikimedia.org as well as
 *  upload.wikimedia.org, so both are accepted. */
const imageHost = /(^|\.)(upload|thumb)\.wikimedia\.org$/;
const safeUrl = (value: string | undefined | null, host: RegExp) => {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && host.test(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

async function article(
  lang: "en" | "zh",
  title: string,
  signal?: AbortSignal,
): Promise<{
  title: string;
  url: string;
  extract: string;
  files: string[];
} | null> {
  const reply = await ask(
    endpoint(lang, {
      redirects: "1",
      titles: title,
      prop: "extracts|pageimages|info|images|pageprops",
      exintro: "1",
      explaintext: "1",
      exsentences: "5",
      piprop: "name",
      inprop: "url",
      imlimit: "40",
      ppprop: "disambiguation",
    }),
    signal,
  );
  const page = Object.values(reply.query?.pages || {})[0];
  if (
    !page ||
    page.missing !== undefined ||
    page.pageprops?.disambiguation !== undefined
  )
    return null;
  const url = safeUrl(page.fullurl, /\.wikipedia\.org$/);
  if (!url) return null;
  const files = [
    ...(page.pageimage ? [`File:${page.pageimage}`] : []),
    ...(page.images || []).map((image) => image.title),
  ]
    .filter(
      (name, index, all) =>
        /\.(jpe?g|png|webp)$/i.test(name) &&
        !skip.test(name) &&
        all.indexOf(name) === index,
    )
    .slice(0, 10);
  return {
    title: page.title || title,
    url,
    extract: (page.extract || "").trim(),
    files,
  };
}

async function photos(
  files: string[],
  signal?: AbortSignal,
): Promise<WikiPhoto[]> {
  if (!files.length) return [];
  const reply = await ask(
    endpoint("en", {
      titles: files.join("|"),
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "960",
    }),
    signal,
  );
  const pages = Object.values(reply.query?.pages || {});
  const byName = new Map(pages.map((page) => [page.title, page]));
  const out: WikiPhoto[] = [];
  for (const name of files) {
    const page = byName.get(name);
    const info = page?.imageinfo?.[0];
    // Only freely licensed files hosted on Commons are shown.
    if (!page || !info || page.imagerepository !== "shared") continue;
    const src = safeUrl(info.thumburl, imageHost);
    const filePage = safeUrl(info.descriptionurl, /(^|\.)wikimedia\.org$/);
    if (!src || !filePage || !info.thumbwidth || !info.thumbheight) continue;
    const meta = info.extmetadata || {};
    out.push({
      src,
      width: info.thumbwidth,
      height: info.thumbheight,
      page: filePage,
      artist: plain(meta.Artist?.value) || "Unknown author",
      license: plain(meta.LicenseShortName?.value) || "see file page",
      licenseUrl: safeUrl(meta.LicenseUrl?.value, /./),
      name: name.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
    });
    if (out.length >= 6) break;
  }
  return out;
}

/** Try each candidate title in turn and return the first real article. */
export async function loadWikimedia(
  lang: "en" | "zh",
  candidates: string[],
  signal?: AbortSignal,
): Promise<WikiResult | null> {
  for (const candidate of candidates) {
    const found = await article(lang, candidate, signal);
    if (!found) continue;
    return {
      lang,
      title: found.title,
      url: found.url,
      extract: found.extract,
      photos: await photos(found.files, signal).catch(() => []),
    };
  }
  return null;
}
