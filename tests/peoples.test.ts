import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  peopleBriefs,
  peopleBySlug,
  peoplesOfLabel,
} from "@/content/peoples-index";
import { peopleProfiles, profileBySlug } from "@/content/peoples";
import type { AtlasCollection } from "@/lib/atlas-types";

const villages = JSON.parse(
  readFileSync(
    new URL("../public/data/atlas/villages.geojson", import.meta.url),
    "utf8",
  ),
) as AtlasCollection;

const cjk = /[㐀-鿿]/;

describe("the sixteen peoples", () => {
  it("has sixteen unique slugs and source labels", () => {
    expect(peopleBriefs).toHaveLength(16);
    expect(new Set(peopleBriefs.map((p) => p.slug)).size).toBe(16);
    expect(new Set(peopleBriefs.map((p) => p.group)).size).toBe(16);
    expect(peopleBySlug.size).toBe(16);
    expect(peopleProfiles).toHaveLength(16);
  });

  it("gives every people a bilingual name, line and place", () => {
    for (const p of peopleBriefs) {
      for (const field of [p.name, p.where, p.line]) {
        expect(field.en.trim().length, p.slug).toBeGreaterThan(0);
        expect(cjk.test(field.zh), `${p.slug} zh`).toBe(true);
      }
      expect(p.population).toBeGreaterThan(0);
    }
  });

  it("marks only the three published population figures as official", () => {
    const official = peopleBriefs.filter((p) => p.official).map((p) => p.slug);
    expect(official.sort()).toEqual(["amis", "atayal", "paiwan"]);
  });

  it("has a full bilingual profile for each people", () => {
    for (const brief of peopleBriefs) {
      const profile = profileBySlug.get(brief.slug)!;
      expect(profile, brief.slug).toBeTruthy();
      expect(profile.history.length, `${brief.slug} history`).toBeGreaterThan(
        1,
      );
      expect(profile.today.length, `${brief.slug} today`).toBeGreaterThan(0);
      expect(profile.terms.length, `${brief.slug} terms`).toBeGreaterThan(0);
      const paragraphs = [
        profile.summary,
        profile.discuss,
        ...profile.history,
        ...profile.today,
        ...profile.terms.map((t) => t.gloss),
      ];
      for (const l of paragraphs) {
        expect(l.en.trim().length, brief.slug).toBeGreaterThan(10);
        expect(cjk.test(l.zh), `${brief.slug} zh`).toBe(true);
      }
    }
  });
});

describe("village records and peoples", () => {
  it("resolves every village's group label to at least one people", () => {
    const unresolved = villages.features.filter(
      (f) => peoplesOfLabel(f.properties.group).length === 0,
    );
    expect(unresolved.map((f) => f.properties.id)).toEqual([]);
  });

  it("splits compound labels and keeps source order", () => {
    expect(peoplesOfLabel("拉阿魯哇族、布農族").map((p) => p.slug)).toEqual([
      "hlaalua",
      "bunun",
    ]);
    expect(peoplesOfLabel("泰雅族").map((p) => p.slug)).toEqual(["atayal"]);
  });

  it("drops unknown labels rather than guessing", () => {
    expect(peoplesOfLabel("not a people")).toEqual([]);
    expect(peoplesOfLabel(undefined)).toEqual([]);
    expect(peoplesOfLabel(7)).toEqual([]);
  });

  it("reaches all sixteen peoples from the village list", () => {
    const seen = new Set(
      villages.features.flatMap((f) =>
        peoplesOfLabel(f.properties.group).map((p) => p.slug),
      ),
    );
    expect([...seen].sort()).toEqual(peopleBriefs.map((p) => p.slug).sort());
  });

  it("finds the Atayal for the Wsilung record the page was built from", () => {
    const wsilung = villages.features.find((f) => f.id === "village-7")!;
    expect(wsilung.properties.title).toBe("Wsilung");
    expect(peoplesOfLabel(wsilung.properties.group)[0].slug).toBe("atayal");
  });
});
