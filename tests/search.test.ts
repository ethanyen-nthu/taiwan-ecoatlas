import { describe, expect, it } from "vitest";
import {
  groupHits,
  kindOrder,
  noteOf,
  normalise,
  queryTokens,
  search,
  type SearchRow,
} from "@/lib/search";
import { searchRows } from "@/server/search-index";

const sample: SearchRow[] = [
  ["county", "Taitung County", "臺東縣", "/county/10014"],
  ["county", "Taipei City", "臺北市", "/county/63000"],
  ["people", "Amis", "阿美族", "/culture/peoples/amis", "Hualien 花蓮"],
  ["tree", "Banyan", "榕樹", "/plants/榕樹", "Ficus microcarpa"],
  [
    "page",
    "Latest Taitung news",
    "最新臺東消息",
    "/x",
    "",
    ["Line one", "第一行"],
  ],
  ["term", "Air quality index", "空氣品質指標", "/teach/glossary#aqi", "AQI"],
];

describe("normalise", () => {
  it("treats 台 and 臺 as the same character", () => {
    expect(normalise("台東")).toBe(normalise("臺東"));
  });
  it("ignores case, accents and repeated spaces", () => {
    expect(normalise("  Café   Taïpei ")).toBe("cafe taipei");
  });
});

describe("queryTokens", () => {
  it("splits on spaces and drops empties", () => {
    expect(queryTokens("  PM2.5   台東 ")).toEqual(["pm2.5", "臺東"]);
    expect(queryTokens("   ")).toEqual([]);
  });
});

describe("search", () => {
  it("returns nothing for an empty query", () => {
    expect(search(sample, "")).toEqual([]);
    expect(search(sample, "   ")).toEqual([]);
  });
  it("finds a county by either spelling of 臺/台 and by English", () => {
    for (const q of ["台東", "臺東", "taitung"]) {
      expect(search(sample, q)[0].row[3]).toBe("/county/10014");
    }
  });
  it("needs every word to match", () => {
    expect(search(sample, "taitung news").map((h) => h.row[3])).toEqual(["/x"]);
    expect(search(sample, "taitung zebra")).toEqual([]);
  });
  it("finds a row by its extra words and ranks a title match above it", () => {
    const hits = search(sample, "hualien");
    expect(hits.map((h) => h.row[3])).toEqual(["/culture/peoples/amis"]);
    const both: SearchRow[] = [
      ["page", "Rivers", "河川", "/a", "tree"],
      ["tree", "Tree", "樹", "/b"],
    ];
    expect(search(both, "tree")[0].row[3]).toBe("/b");
  });
  it("ranks an exact title above a longer one that only starts with it", () => {
    const rows: SearchRow[] = [
      ["page", "Amis history", "x", "/long"],
      ["people", "Amis", "阿美族", "/exact"],
    ];
    expect(search(rows, "amis").map((h) => h.row[3])).toEqual([
      "/exact",
      "/long",
    ]);
  });
  it("matches a Chinese word inside a Chinese title", () => {
    expect(search(sample, "品質")[0].row[3]).toBe("/teach/glossary#aqi");
  });
});

describe("groupHits", () => {
  it("lists groups in the fixed order and keeps the ranking inside each", () => {
    const groups = groupHits(search(sample, "tai"));
    expect(groups.map((g) => g.kind)).toEqual(["page", "county"]);
    expect(groups[1].hits.map((h) => h.row[3]).sort()).toEqual([
      "/county/10014",
      "/county/63000",
    ]);
  });
});

describe("noteOf", () => {
  it("picks the line for the language, or the one string, or nothing", () => {
    expect(noteOf(sample[4], "en")).toBe("Line one");
    expect(noteOf(sample[4], "zh")).toBe("第一行");
    expect(noteOf(["term", "a", "b", "/c", "", "same"], "zh")).toBe("same");
    expect(noteOf(sample[0], "en")).toBe("");
  });
});

describe("the real index", () => {
  it("has every kind, with titles in both languages and unique links", async () => {
    const rows = await searchRows();
    const kinds = new Set(rows.map((row) => row[0]));
    expect([...kinds].sort()).toEqual([...kindOrder].sort());
    for (const row of rows) {
      expect(row[1].trim(), row[3]).not.toBe("");
      expect(row[2].trim(), row[3]).not.toBe("");
      expect(row[3].startsWith("/"), row[3]).toBe(true);
    }
    const keys = rows.map((row) => `${row[0]} ${row[3]}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.filter((row) => row[0] === "county")).toHaveLength(22);
    expect(rows.filter((row) => row[0] === "people")).toHaveLength(16);
  });

  it("answers the example searches with the right first result", async () => {
    const rows = await searchRows();
    const first = (q: string, kind: string) =>
      search(rows, q).find((hit) => hit.row[0] === kind)?.row;
    expect(first("Taitung", "county")?.[3]).toMatch(/^\/county\//);
    expect(first("台東", "county")?.[1]).toMatch(/Taitung/);
    expect(first("Amis", "people")?.[3]).toBe("/culture/peoples/amis");
    expect(first("阿美", "people")?.[3]).toBe("/culture/peoples/amis");
    expect(first("reservoir", "page")?.[3]).toBe("/environment/reservoirs");
    expect(first("warming", "page")?.[3]).toBe(
      "/environment/temperature-over-time",
    );
    const air = search(rows, "PM2.5")
      .filter((hit) => hit.row[0] === "page")
      .map((hit) => hit.row[3]);
    expect(air).toContain("/environment");
    expect(air).toContain("/environment/air-over-time");
    expect(first("榕樹", "tree")?.[3]).toContain("%E6%A6%95");
    expect(first("feedback", "page")?.[3]).toBe("/feedback");
  });

  it("is small enough to send to every visitor once", async () => {
    const text = JSON.stringify(await searchRows());
    expect(text.length).toBeLessThan(900_000);
  });
});
