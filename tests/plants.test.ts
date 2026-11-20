import { describe, expect, it } from "vitest";
import {
  habitLabels,
  originLabels,
  plantInfo,
  findPlant,
} from "../src/content/plants";
import { loadPlants } from "../src/server/plants";

describe("plants guide", () => {
  it("counts every surveyed tree once and keeps kinds unique", async () => {
    const { rows, totalTrees } = await loadPlants();
    expect(rows).toHaveLength(496);
    expect(new Set(rows.map((row) => row.name)).size).toBe(rows.length);
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(totalTrees);
    for (const row of rows)
      expect(row.park + row.riverside, row.name).toBe(row.count);
  });

  it("only describes trees that appear in the inventories", async () => {
    const { rows } = await loadPlants();
    const names = new Set(rows.map((row) => row.name));
    expect(Object.keys(plantInfo).filter((name) => !names.has(name))).toEqual(
      [],
    );
  });

  it("describes the commonest trees: at least 85% of all trees", async () => {
    const { rows, totalTrees } = await loadPlants();
    const guided = rows.filter((row) => row.guided);
    expect(guided).toHaveLength(Object.keys(plantInfo).length);
    expect(
      guided.reduce((sum, row) => sum + row.count, 0) / totalTrees,
    ).toBeGreaterThan(0.85);
    // The guide starts with the most common kinds, with no gaps.
    const top = [...rows].sort((a, b) => b.count - a.count).slice(0, 30);
    expect(top.filter((row) => !row.guided).map((row) => row.name)).toEqual([]);
  });

  it("gives each entry a scientific name, bilingual note and known labels", () => {
    for (const [name, info] of Object.entries(plantInfo)) {
      expect(info.sci, name).toMatch(/^[A-Z][a-z]+( [a-z×.'-]+)*/);
      expect(info.en, name).toBeTruthy();
      expect(info.note.en.length, name).toBeGreaterThan(40);
      expect(info.note.zh.length, name).toBeGreaterThan(15);
      expect(habitLabels[info.habit], name).toBeTruthy();
      if (info.origin) expect(originLabels[info.origin], name).toBeTruthy();
    }
    expect(findPlant("榕樹")?.sci).toBe("Ficus microcarpa");
    expect(findPlant("not a tree")).toBeUndefined();
  });

  it("reports sizes as medians so a few entry errors do not distort them", async () => {
    const { rows } = await loadPlants();
    const banyan = rows.find((row) => row.name === "榕樹")!;
    expect(banyan.medianHeightM).toBeGreaterThan(3);
    expect(banyan.medianHeightM).toBeLessThan(30);
    expect(banyan.p90HeightM!).toBeGreaterThanOrEqual(banyan.medianHeightM!);
  });
});
