import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  familyZh,
  findSpeciesInfo,
  speciesInfo,
  speciesLabel,
  speciesShortName,
} from "../src/content/species-info";

const index = JSON.parse(
  readFileSync("public/data/atlas/wildlife.species.json", "utf8"),
) as { species: { id: string; name: string; scientificName?: string }[] };
const names = index.species.map((item) => item.scientificName || item.name);

describe("animal names", () => {
  it("covers every taxon in the published roadkill subset, and nothing else", () => {
    expect(names).toHaveLength(99);
    expect(names.filter((name) => !findSpeciesInfo(name))).toEqual([]);
    expect(Object.keys(speciesInfo).sort()).toEqual([...names].sort());
  });

  it("gives every taxon a common name and a short description in both languages", () => {
    for (const name of names) {
      const info = speciesInfo[name];
      expect(info.zh || info.en, name).toBeTruthy();
      expect(info.note.en.length, name).toBeGreaterThan(30);
      expect(info.note.zh.length, name).toBeGreaterThanOrEqual(8);
    }
  });

  it("only leaves a Chinese name empty where none was confirmed, and says so", () => {
    expect(
      names.filter((name) => !speciesInfo[name].zh),
      "Taxa without a confirmed Chinese name",
    ).toEqual(["Emoia atrocostata"]);
    const provisional = names.filter((name) => speciesInfo[name].provisional);
    expect(provisional.sort()).toEqual(
      [
        "Anourosorex yamashinai",
        "Bandicota indica",
        "Crocidura tanakae",
        "Eothenomys melanogaster",
        "Myophonus caeruleus",
        "Pnoepyga formosana",
        "Sphenomorphus taiwanensis",
      ].sort(),
    );
  });

  it("writes Chinese names with Chinese characters only", () => {
    for (const name of names) {
      const zh = speciesInfo[name].zh;
      if (zh) expect(zh, name).toMatch(/^[一-鿿]+$/);
    }
  });

  it("labels a species in the reader's language first and keeps the scientific name", () => {
    expect(speciesLabel("Duttaphrynus melanostictus", "zh")).toBe(
      "黑眶蟾蜍 · Asian common toad (Duttaphrynus melanostictus)",
    );
    expect(speciesLabel("Duttaphrynus melanostictus", "en")).toBe(
      "Asian common toad · 黑眶蟾蜍 (Duttaphrynus melanostictus)",
    );
    expect(speciesShortName("Duttaphrynus melanostictus", "zh")).toBe(
      "黑眶蟾蜍",
    );
    expect(speciesShortName("Duttaphrynus melanostictus", "en")).toBe(
      "Asian common toad",
    );
    expect(speciesLabel("Unknown species", "zh")).toBe("Unknown species");
    // With no Chinese name the English one is shown, never an invented name.
    expect(speciesShortName("Emoia atrocostata", "zh")).toBe("Littoral skink");
  });

  it("translates every family the pages can show, including corrected ones", () => {
    const families = new Set([
      ...index.species.map((item) => (item as { family?: string }).family),
      ...Object.values(speciesInfo).map((info) => info.family),
    ]);
    for (const family of families)
      if (family) expect(familyZh[family], family).toMatch(/科$/);
  });
});
