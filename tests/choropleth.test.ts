import { describe, expect, it } from "vitest";
import { buildChoropleth, subjectRamps } from "@/lib/choropleth";
import { atlasFacts } from "@/server/facts";

const row = (code: string, value: number | null, count = 1) => ({
  code,
  value,
  count,
});

describe("county choropleth", () => {
  it("shades measured counties in five classes of near-equal size", () => {
    const rows = Array.from({ length: 20 }, (_, index) =>
      row(`c${index}`, index * 3),
    );
    const result = buildChoropleth(rows, "forests")!;
    expect(result.measured).toBe(true);
    expect(result.official).toBe(false);
    expect(result.classes).toHaveLength(5);
    expect(result.classes.map((item) => item.n)).toEqual([4, 4, 4, 4, 4]);
    expect(result.classes.map((item) => item.color)).toEqual(
      subjectRamps.forests,
    );
    // The smallest value takes the lightest colour, the largest the darkest.
    expect(result.tint.c0).toBe(subjectRamps.forests[0]);
    expect(result.tint.c19).toBe(subjectRamps.forests[4]);
    // Class ranges never overlap and ascend.
    for (let i = 1; i < result.classes.length; i += 1)
      expect(result.classes[i].from).toBeGreaterThan(result.classes[i - 1].to);
  });

  it("leaves counties without a value unshaded and reports them", () => {
    const rows = [
      row("a", 1),
      row("b", 2),
      row("c", 3),
      row("d", 4),
      row("e", null),
    ];
    const result = buildChoropleth(rows, "environment")!;
    expect(result.tint.e).toBeUndefined();
    expect(result.missing).toBe(1);
  });

  it("uses record counts when no measurement exists, and skips empty counties", () => {
    const rows = [
      row("a", null, 10),
      row("b", null, 40),
      row("c", null, 90),
      row("d", null, 0),
    ];
    const result = buildChoropleth(rows, "wildlife")!;
    expect(result.measured).toBe(false);
    expect(result.tint.d).toBeUndefined();
    expect(result.tint.a).toBe(subjectRamps.wildlife[0]);
  });

  it("refuses to draw a pattern from fewer than three counties", () => {
    expect(buildChoropleth([row("a", 1), row("b", 2)], "urban")).toBeNull();
    expect(buildChoropleth([], "urban")).toBeNull();
  });

  it("colours AQI counties with the official bands, not a ramp", () => {
    const result = buildChoropleth(
      [row("a", 30), row("b", 80), row("c", 130)],
      "environment",
      { aqi: true },
    )!;
    expect(result.official).toBe(true);
    expect(result.classes).toEqual([]);
    expect(new Set(Object.values(result.tint)).size).toBe(3);
  });

  it("handles identical values without inventing classes", () => {
    const result = buildChoropleth(
      [row("a", 5), row("b", 5), row("c", 5), row("d", 5)],
      "culture",
    )!;
    expect(Object.keys(result.tint)).toHaveLength(4);
    expect(new Set(Object.values(result.tint)).size).toBe(1);
  });
});

describe("published facts", () => {
  it("count the shipped files", async () => {
    const facts = await atlasFacts();
    expect(facts.wildlife.records).toBe(10841);
    expect(facts.wildlife.species).toBe(99);
    expect(facts.wildlife.firstDate.slice(0, 4)).toBe("2014");
    expect(facts.wildlife.lastDate.slice(0, 4)).toBe("2017");
    expect(facts.wildlife.byMonth).toHaveLength(12);
    expect(facts.wildlife.byMonth.reduce((a, b) => a + b, 0)).toBe(
      facts.wildlife.records,
    );
    expect(facts.culture.villages).toBe(730);
    expect(facts.urban.parkTrees).toBe(85177);
    const forests = facts.forests.counties;
    expect(forests.length).toBeGreaterThan(15);
    expect(forests[0].sharePct).toBeGreaterThanOrEqual(
      forests[forests.length - 1].sharePct,
    );
    expect(facts.forests.unavailable.length).toBeGreaterThan(0);
  });
});
