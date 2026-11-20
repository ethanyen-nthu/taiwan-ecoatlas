import { describe, expect, it } from "vitest";
import { glossary } from "@/content/glossary";
import { lessonMeta, lessonsFor, type L } from "@/content/lesson-index";
import { buildLessons, type Lesson } from "@/content/lessons";
import { countyDetail, countyRows } from "@/lib/county-rows";
import { atlasFacts } from "@/server/facts";

const cjk = /[㐀-鿿]/;
const routes = new Set([
  "environment",
  "forests",
  "wildlife",
  "culture",
  "urban",
  "county",
  "explore",
  "teach",
  "data",
  "sources",
  "about",
]);

/** Every piece of text a lesson shows, so one pass can check all of it. */
function texts(lesson: Lesson): L[] {
  return [
    lesson.title,
    lesson.summary,
    lesson.level,
    lesson.assess,
    ...lesson.objectives,
    ...lesson.prepare,
    ...lesson.background,
    ...lesson.notice,
    ...lesson.questions,
    ...lesson.pitfalls,
    ...lesson.steps.flatMap((step) => [
      step.title,
      step.body,
      ...(step.hrefLabel ? [step.hrefLabel] : []),
    ]),
    ...(lesson.table
      ? [
          lesson.table.caption,
          ...lesson.table.head,
          ...lesson.table.rows.flat(),
        ]
      : []),
  ];
}

describe("lessons", () => {
  it("builds one lesson per index entry", async () => {
    const lessons = buildLessons(await atlasFacts());
    expect(lessons.map((lesson) => lesson.slug)).toEqual(
      lessonMeta.map((lesson) => lesson.slug),
    );
  });

  it("is bilingual everywhere and never prints a broken number", async () => {
    for (const lesson of buildLessons(await atlasFacts())) {
      for (const text of texts(lesson)) {
        // Empty table cells are the blanks a student fills in; both sides match.
        if (text.en === "" || text.zh === "")
          expect(text, lesson.slug).toEqual({ en: "", zh: "" });
        else {
          expect(text.en.trim(), lesson.slug).not.toBe("");
          expect(text.zh.trim(), lesson.slug).not.toBe("");
        }
        for (const side of [text.en, text.zh]) {
          expect(side, lesson.slug).not.toMatch(
            /undefined|NaN|\[object|Infinity|\{\w+\}/,
          );
        }
      }
      // Titles, summaries and objectives must really be Chinese in zh.
      for (const text of [lesson.title, lesson.summary, ...lesson.objectives])
        expect(text.zh, lesson.slug).toMatch(cjk);
    }
  });

  it("has everything a lecturer needs", async () => {
    for (const lesson of buildLessons(await atlasFacts())) {
      expect(lesson.minutes, lesson.slug).toBeGreaterThanOrEqual(20);
      expect(lesson.objectives.length, lesson.slug).toBeGreaterThanOrEqual(2);
      expect(lesson.steps.length, lesson.slug).toBeGreaterThanOrEqual(3);
      expect(lesson.questions.length, lesson.slug).toBeGreaterThanOrEqual(3);
      expect(lesson.pitfalls.length, lesson.slug).toBeGreaterThanOrEqual(1);
      expect(lesson.sources.length, lesson.slug).toBeGreaterThanOrEqual(1);
      expect(lesson.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const source of lesson.sources)
        expect(source.url, lesson.slug).toMatch(/^(https:\/\/|\/[a-z])/);
    }
  });

  it("links only to pages and counties that exist", async () => {
    const facts = await atlasFacts();
    const codes = new Set(countyRows(facts).map((row) => row.code));
    for (const lesson of buildLessons(facts)) {
      for (const step of lesson.steps) {
        if (!step.href) continue;
        expect(step.href, lesson.slug).toMatch(/^\/[a-z]/);
        const url = new URL(step.href, "https://example.test");
        const [first, second] = url.pathname.split("/").filter(Boolean);
        expect(routes.has(first), `${lesson.slug}: ${step.href}`).toBe(true);
        if (first === "county") expect(codes.has(second)).toBe(true);
        if (first === "teach" && second && second !== "glossary")
          expect(
            lessonMeta.some((item) => item.slug === second),
            step.href,
          ).toBe(true);
        // The decoded query must survive a round trip.
        expect(() => decodeURIComponent(url.search.slice(1))).not.toThrow();
      }
    }
  });

  it("quotes the same counts the data files hold", async () => {
    const facts = await atlasFacts();
    const records = facts.wildlife.records.toLocaleString("en");
    const wildlife = buildLessons(facts).find(
      (lesson) => lesson.slug === "roadkill-and-counting-effort",
    )!;
    expect(JSON.stringify(texts(wildlife))).toContain(records);
    const forest = buildLessons(facts).find(
      (lesson) => lesson.slug === "where-is-the-forest",
    )!;
    expect(JSON.stringify(texts(forest))).toContain(
      facts.forests.counties[0].sharePct.toFixed(1),
    );
  });

  it("offers the dataset audit on every subject", () => {
    for (const subject of [
      "environment",
      "urban",
      "forests",
      "wildlife",
      "culture",
    ] as const) {
      const slugs = lessonsFor(subject).map((lesson) => lesson.slug);
      expect(slugs).toContain("audit-a-dataset");
      expect(slugs.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("glossary", () => {
  it("has unique, bilingual, linked terms", () => {
    const ids = glossary.map((term) => term.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(glossary.length).toBeGreaterThanOrEqual(15);
    for (const term of glossary) {
      expect(term.term.zh, term.id).toMatch(cjk);
      expect(term.meaning.zh, term.id).toMatch(cjk);
      expect(term.meaning.en.length, term.id).toBeGreaterThan(40);
      if (term.lesson)
        expect(
          lessonMeta.some((lesson) => lesson.slug === term.lesson),
          term.id,
        ).toBe(true);
    }
  });
});

describe("county profiles", () => {
  it("ranks counties and never invents a missing dataset", async () => {
    const facts = await atlasFacts();
    const rows = countyRows(facts);
    expect(rows.length).toBeGreaterThanOrEqual(20);
    const top = rows.reduce((a, b) => (b.wildlife > a.wildlife ? b : a));
    expect(top.wildlifeRank).toBe(1);
    expect(top.wildlife).toBe(facts.wildlife.byCounty[0].count);
    for (const row of rows) {
      if (row.wildlife === 0) expect(row.wildlifeRank).toBe(0);
      if (row.forestShare === null) expect(row.forestRank).toBeNull();
    }
    // Only Taipei has the park-tree inventory.
    expect(countyDetail(facts, "63000")?.urban).not.toBeNull();
    expect(countyDetail(facts, "10002")?.urban ?? null).toBeNull();
    expect(countyDetail(facts, "nope")).toBeNull();
  });
});
