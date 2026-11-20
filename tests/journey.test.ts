import { describe, expect, it } from "vitest";
import { journeyMarks } from "../src/server/journey";
import {
  islandFrame,
  islandPoint,
  forestImageBox,
} from "../src/lib/island-path";

describe("home scroll story marks", () => {
  it("maps the island's corners onto its 160 × 300 frame", () => {
    expect(islandPoint(islandFrame.west, islandFrame.north)).toEqual([0, 0]);
    const [x, y] = islandPoint(islandFrame.east, islandFrame.south);
    expect(x).toBeCloseTo(160);
    expect(y).toBeCloseTo(300);
    const box = forestImageBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(95);
  });

  it("draws every village and Taipei park, and every record cell, as short path strings", async () => {
    const marks = await journeyMarks();
    const dots = (d: string) => (d.match(/M/g) || []).length;
    expect(dots(marks.villages)).toBeGreaterThan(700);
    expect(dots(marks.parks)).toBe(812);
    expect(marks.cells).toHaveLength(4);
    expect(marks.cellCount + marks.offshoreCells).toBe(348);
    expect(
      marks.cells.reduce((sum, d) => sum + (d.match(/z/g) || []).length, 0),
    ).toBe(marks.cellCount);
    expect(
      marks.villages.length + marks.parks.length + marks.cells.join("").length,
    ).toBeLessThan(60000);
  });
});
