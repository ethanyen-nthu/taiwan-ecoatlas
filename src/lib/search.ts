/**
 * Site search, kept free of React and the file system so a test can feed it a
 * few invented rows. The server builds the rows once (src/server/search-index.ts)
 * and the search page filters them in the visitor's browser: nothing the
 * visitor types is sent anywhere.
 */

export type SearchKind =
  | "page"
  | "county"
  | "people"
  | "lesson"
  | "term"
  | "animal"
  | "tree"
  | "village";

/** One thing that can be found: kind, English title, Chinese title, link,
 *  extra words that are searched but not shown, and a short line shown under
 *  the title (one string, or English and Chinese). */
export type SearchRow = [
  kind: SearchKind,
  en: string,
  zh: string,
  href: string,
  extra?: string,
  note?: string | [string, string],
];

/** The line under a result, in the reader's language. */
export function noteOf(row: SearchRow, language: "en" | "zh"): string {
  const note = row[5];
  if (!note) return "";
  return typeof note === "string" ? note : note[language === "en" ? 0 : 1];
}

/** The order groups are listed in. */
export const kindOrder: SearchKind[] = [
  "page",
  "county",
  "people",
  "lesson",
  "term",
  "animal",
  "tree",
  "village",
];

export const kindLabels: Record<SearchKind, { en: string; zh: string }> = {
  page: { en: "Pages", zh: "頁面" },
  county: { en: "Counties and cities", zh: "縣市" },
  people: { en: "Indigenous peoples", zh: "原住民族" },
  lesson: { en: "Lessons", zh: "課程" },
  term: { en: "Glossary", zh: "名詞解釋" },
  animal: { en: "Animals", zh: "動物" },
  tree: { en: "Trees", zh: "樹木" },
  village: { en: "Villages", zh: "部落" },
};

/** Lower case, no accents, one kind of space, and 臺 for the very common 台,
 *  so 台東 finds 臺東 and the other way round. */
export function normalise(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/台/g, "臺")
    .replace(/[\s　]+/g, " ")
    .trim();
}

export function queryTokens(query: string): string[] {
  return normalise(query)
    .split(" ")
    .filter((token) => token.length > 0);
}

interface Prepared {
  en: string;
  zh: string;
  extra: string;
}
const prepared = new WeakMap<SearchRow, Prepared>();
function prepare(row: SearchRow): Prepared {
  let value = prepared.get(row);
  if (!value) {
    value = {
      en: normalise(row[1]),
      zh: normalise(row[2]),
      extra: normalise(row[4] ?? ""),
    };
    prepared.set(row, value);
  }
  return value;
}

/** How well one word matches one row; 0 means it does not. */
function tokenScore(token: string, row: Prepared): number {
  if (row.en === token || row.zh === token) return 100;
  if (row.en.startsWith(token) || row.zh.startsWith(token)) return 60;
  if (row.en.includes(` ${token}`)) return 45;
  if (row.en.includes(token) || row.zh.includes(token)) return 25;
  if (row.extra.includes(` ${token}`) || row.extra.startsWith(token)) return 15;
  if (row.extra.includes(token)) return 10;
  return 0;
}

export interface SearchHit {
  row: SearchRow;
  score: number;
}

/** Rows that contain every word of the query, best match first. A match in
 *  a title beats a match in the extra words; ties go to the shorter title and
 *  then to the group order. */
export function search(rows: SearchRow[], query: string): SearchHit[] {
  const words = queryTokens(query);
  if (words.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const row of rows) {
    const text = prepare(row);
    let score = 0;
    for (const word of words) {
      const part = tokenScore(word, text);
      if (part === 0) {
        score = 0;
        break;
      }
      score += part;
    }
    if (score > 0) {
      score -= Math.min(text.en.length || text.zh.length, 40) / 100;
      hits.push({ row, score });
    }
  }
  return hits.sort(
    (a, b) =>
      b.score - a.score ||
      kindOrder.indexOf(a.row[0]) - kindOrder.indexOf(b.row[0]) ||
      a.row[1].localeCompare(b.row[1]),
  );
}

export interface SearchGroup {
  kind: SearchKind;
  hits: SearchHit[];
}

/** Hits split by kind, in the fixed group order, keeping each group's ranking. */
export function groupHits(hits: SearchHit[]): SearchGroup[] {
  return kindOrder
    .map((kind) => ({ kind, hits: hits.filter((hit) => hit.row[0] === kind) }))
    .filter((group) => group.hits.length > 0);
}
