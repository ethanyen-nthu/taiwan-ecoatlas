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

  it("draws every village and Taipei park as short path strings, and the roadkill counties in five shades", async () => {
    const marks = await journeyMarks();
    const dots = (d: string) => (d.match(/M/g) || []).length;
    expect(dots(marks.villages)).toBeGreaterThan(700);
    expect(dots(marks.parks)).toBe(812);
    expect(marks.counties).toHaveLength(5);
    // Nineteen counties sit on the main island; each has at least one ring.
    expect(
      marks.counties.reduce((sum, d) => sum + (d.match(/M/g) || []).length, 0),
    ).toBeGreaterThanOrEqual(19);
    expect(marks.counties.every((d) => d.length > 0)).toBe(true);
    // Penghu 25 + Kinmen 121 + Lienchiang 1,188 are outside the frame.
    expect(marks.offshoreRecords).toBe(1334);
    expect(
      marks.villages.length +
        marks.parks.length +
        marks.counties.join("").length,
    ).toBeLessThan(80000);
  });
});
